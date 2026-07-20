import type { Guild, NonThreadGuildBasedChannel, Role } from 'discord.js';
import { prisma } from '../../infrastructure/prisma.js';
import { logger } from '../../infrastructure/logger.js';

export async function createSnapshot(
  guild: Guild,
  resourceType: string,
  resourceId?: string
): Promise<void> {
  if (resourceType === 'CHANNEL' && resourceId) {
    const channel = guild.channels.cache.get(resourceId);
    if (!channel || channel.isThread()) return;
    await saveChannelSnapshot(guild.id, channel as NonThreadGuildBasedChannel);
  } else if (resourceType === 'ROLE' && resourceId) {
    const role = guild.roles.cache.get(resourceId);
    if (!role || role.managed) return;
    await saveRoleSnapshot(guild.id, role);
  } else if (resourceType === 'GUILD') {
    await Promise.all(
      guild.roles.cache
        .filter((r) => !r.managed && r.id !== guild.id)
        .map((role) => saveRoleSnapshot(guild.id, role))
    );
    await Promise.all(
      guild.channels.cache
        .filter((c) => !c.isThread())
        .map((channel) => saveChannelSnapshot(guild.id, channel as NonThreadGuildBasedChannel))
    );
  }
}

async function saveChannelSnapshot(guildId: string, channel: NonThreadGuildBasedChannel): Promise<void> {
  const payload = {
    type: channel.type,
    name: channel.name,
    topic: 'topic' in channel ? channel.topic : undefined,
    nsfw: 'nsfw' in channel ? channel.nsfw : undefined,
    parentId: channel.parentId,
    position: channel.position,
    rateLimitPerUser: 'rateLimitPerUser' in channel ? channel.rateLimitPerUser : undefined,
    bitrate: 'bitrate' in channel ? channel.bitrate : undefined,
    userLimit: 'userLimit' in channel ? channel.userLimit : undefined,
    permissionOverwrites: channel.permissionOverwrites.cache.map((o) => ({
      id: o.id,
      type: o.type,
      allow: o.allow.bitfield.toString(),
      deny: o.deny.bitfield.toString(),
    })),
  };
  await upsertSnapshot(guildId, 'CHANNEL', channel.id, payload);
}

async function saveRoleSnapshot(guildId: string, role: Role): Promise<void> {
  const payload = {
    name: role.name,
    color: role.color,
    permissions: role.permissions.bitfield.toString(),
    hoist: role.hoist,
    mentionable: role.mentionable,
    position: role.position,
  };
  await upsertSnapshot(guildId, 'ROLE', role.id, payload);
}

async function upsertSnapshot(
  guildId: string,
  resourceType: 'CHANNEL' | 'ROLE',
  resourceId: string,
  payload: unknown
): Promise<void> {
  await prisma.resourceSnapshot.upsert({
    where: {
      guildId_resourceType_resourceId: { guildId, resourceType, resourceId },
    },
    create: { guildId, resourceType, resourceId, payload: payload as object, version: 1 },
    update: { payload: payload as object, version: { increment: 1 } },
  });
  logger.debug({ guildId, resourceType, resourceId }, 'Snapshot saved');
}
