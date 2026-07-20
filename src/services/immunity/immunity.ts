import type { Client, Guild, GuildMember } from 'discord.js';
import { redis } from '../../infrastructure/redis.js';
import { logger } from '../../infrastructure/logger.js';

const APP_OWNER_TTL_SECONDS = 300;

export async function isImmune(
  client: Client,
  guild: Guild,
  userId: string
): Promise<boolean> {
  if (userId === guild.ownerId) return true;
  if (userId === client.user?.id) return true;

  try {
    const ownerIds = await getApplicationOwnerIds(client);
    if (ownerIds.has(userId)) return true;
  } catch (err) {
    logger.error({ err, userId }, 'Failed to fetch application owners for immunity');
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && isHighestRole(member)) return true;

  return false;
}

async function getApplicationOwnerIds(client: Client): Promise<Set<string>> {
  const key = `anticrash:app:owners`;
  const cached = await redis.get(key);
  if (cached) return new Set(JSON.parse(cached) as string[]);

  const app = await client.application?.fetch().catch(() => null);
  if (!app) return new Set();

  const ids: string[] = [];
  if (app.owner) {
    if ('members' in app.owner) {
      ids.push(...app.owner.members.map((m: { id: string }) => m.id));
    } else {
      ids.push(app.owner.id);
    }
  }

  await redis.setex(key, APP_OWNER_TTL_SECONDS, JSON.stringify(ids));
  return new Set(ids);
}

function isHighestRole(member: GuildMember): boolean {
  const bot = member.guild.members.me;
  if (!bot) return false;
  return member.roles.highest.position >= bot.roles.highest.position;
}
