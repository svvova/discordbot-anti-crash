import { prisma } from '../../infrastructure/prisma.js';
import { redis } from '../../infrastructure/redis.js';
import { REDIS_NAMESPACE, DEFAULT_THRESHOLD, DEFAULT_WINDOW_SECONDS, DEFAULT_TIMEOUT_SECONDS, PunishmentMode } from '../../config/constants.js';
import type { ServerSettings } from '@prisma/client';

const CACHE_TTL_SECONDS = 60;

function cacheKey(guildId: string): string {
  return `${REDIS_NAMESPACE}:settings:${guildId}`;
}

function defaultSettings(): ServerSettings {
  return {
    id: '',
    guildId: '',
    threshold: DEFAULT_THRESHOLD,
    windowSeconds: DEFAULT_WINDOW_SECONDS,
    logChannelId: null,
    recoveryEnabled: true,
    punishmentMode: PunishmentMode.TIMEOUT,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getSettings(guildId: string): Promise<ServerSettings> {
  const cached = await redis.get(cacheKey(guildId));
  if (cached) return JSON.parse(cached) as ServerSettings;

  const settings = await prisma.serverSettings.findUnique({ where: { guildId } });
  const value = settings ?? defaultSettings();
  await redis.setex(cacheKey(guildId), CACHE_TTL_SECONDS, JSON.stringify(value));
  return value;
}

export async function upsertSettings(
  guildId: string,
  data: Partial<Omit<ServerSettings, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
): Promise<ServerSettings> {
  const updated = await prisma.serverSettings.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
  await redis.del(cacheKey(guildId));
  return updated;
}
