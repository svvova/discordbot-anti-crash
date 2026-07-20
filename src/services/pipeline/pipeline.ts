import type { Client, Guild } from 'discord.js';
import { logger } from '../../infrastructure/logger.js';
import { redis } from '../../infrastructure/redis.js';
import type { SecurityEvent } from '../audit/types.js';
import { correlate } from '../audit/correlator.js';
import { addEventAndGetScore } from '../scoring/scoring.js';
import { isRateLimited } from '../scoring/rate-limit.js';
import { isImmune } from '../immunity/immunity.js';
import { getSettings } from '../settings/settings.js';
import { applyPunishment, persistIncident } from '../punishment/punishment.js';
import { notifyLogChannel, notifyScoreUpdate } from '../logging/logging.js';
import { createSnapshot } from '../recovery/snapshot.js';
import { restoreResource } from '../recovery/restore.js';

export async function handleSecurityEvent(
  client: Client,
  event: SecurityEvent
): Promise<void> {
  logger.info({ eventId: event.id, action: event.action, resourceId: event.resourceId, executorId: event.executorId }, 'handleSecurityEvent called');
  const guild = client.guilds.cache.get(event.guildId);
  if (!guild) {
    logger.debug({ eventId: event.id, guildId: event.guildId }, 'Guild not available for event');
    return;
  }

  if (await isRateLimited(event.guildId, event.action)) {
    logger.warn({ eventId: event.id, guildId: event.guildId, action: event.action }, 'Rate limit hit');
    return;
  }

  const settings = await getSettings(event.guildId);
  const immunityOptions = { adminImmunityEnabled: settings.adminImmunityEnabled };

  if (event.executorId && (await isImmune(client, guild, event.executorId, immunityOptions))) {
    logger.debug({ eventId: event.id, executorId: event.executorId }, 'Executor is immune');
    return;
  }

  const correlation = await correlate(event, guild);
  if (!correlation.executorId || !correlation.correlationId) {
    logger.info(
      { eventId: event.id, reason: correlation.reason, action: event.action, resourceId: event.resourceId },
      'No reliable executor correlation; skipping score update'
    );
    return;
  }

  const correlated = {
    ...event,
    executorId: correlation.executorId,
    auditLogEntryId: correlation.correlationId,
  };
  logger.info(
    { eventId: event.id, executorId: correlated.executorId, correlationId: correlated.auditLogEntryId },
    'Correlated event'
  );

  if (await isImmune(client, guild, correlated.executorId, immunityOptions)) {
    logger.info({ eventId: event.id, executorId: correlated.executorId, adminImmunityEnabled: settings.adminImmunityEnabled }, 'Correlated executor is immune');
    return;
  }

  let recoveryResult: { success: boolean; detail: string } | undefined;
  if (
    settings.recoveryEnabled &&
    (event.action === 'CHANNEL_DELETE' || event.action === 'ROLE_DELETE') &&
    event.resourceId &&
    (event.resourceType === 'CHANNEL' || event.resourceType === 'ROLE')
  ) {
    recoveryResult = await restoreResource(guild, event.resourceType, event.resourceId);
  }

  const score = await addEventAndGetScore(correlated);
  logger.info(
    { eventId: event.id, executorId: correlated.executorId, action: event.action, weight: event.weight, score, threshold: settings.threshold },
    'Score updated'
  );

  if (score >= settings.threshold) {
    await processThresholdCrossing(client, guild, correlated, score, settings, recoveryResult);
  } else {
    await notifyScoreUpdate(client, guild, correlated, score, settings.threshold);
  }
}

async function processThresholdCrossing(
  client: Client,
  guild: Guild,
  event: SecurityEvent & { executorId: string; auditLogEntryId: string },
  score: number,
  settings: { threshold: number; logChannelId: string | null; punishmentMode: string; timeoutSeconds: number; recoveryEnabled: boolean; protectedRoleIds: string[] },
  recoveryResult?: { success: boolean; detail: string }
): Promise<void> {
  const lockKey = `anticrash:lock:punish:${guild.id}:${event.executorId}`;
  const acquired = await redis.set(lockKey, '1', 'PX', 60_000, 'NX');
  if (acquired !== 'OK') {
    logger.debug({ eventId: event.id }, 'Punishment already in progress');
    return;
  }

  try {
    const result = await applyPunishment(guild, event, settings.punishmentMode, settings.timeoutSeconds, settings.protectedRoleIds);
    await persistIncident(event, score, settings.threshold, result, recoveryResult);
    await notifyLogChannel(client, guild, event, score, settings.threshold, result, recoveryResult);
    if (!recoveryResult) {
      await createSnapshot(guild, event.resourceType, event.resourceId);
    }
  } finally {
    await redis.del(lockKey);
  }
}
