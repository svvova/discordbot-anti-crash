import type { Guild, GuildEmoji, NonThreadGuildBasedChannel, Role, Sticker } from 'discord.js';
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
  } else if (resourceType === 'EMOJI' && resourceId) {
    const emoji = guild.emojis.cache.get(resourceId);
    if (!emoji) return;
    await saveEmojiSnapshot(guild.id, emoji);
  } else if (resourceType === 'STICKER' && resourceId) {
    const sticker = guild.stickers.cache.get(resourceId);
    if (!sticker) return;
    await saveStickerSnapshot(guild.id, sticker);
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
    await Promise.all(
      guild.emojis.cache.map((emoji) => saveEmojiSnapshot(guild.id, emoji))
    );
    await Promise.all(
      guild.stickers.cache.map((sticker) => saveStickerSnapshot(guild.id, sticker))
    );
  }
}

export async function saveChannelSnapshot(guildId: string, channel: NonThreadGuildBasedChannel): Promise<void> {
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

export async function saveRoleSnapshot(guildId: string, role: Role): Promise<void> {
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

export async function saveEmojiSnapshot(guildId: string, emoji: GuildEmoji): Promise<void> {
  const payload = {
    name: emoji.name,
    animated: emoji.animated,
    url: emoji.url,
    roles: emoji.roles.cache.map((r) => r.id),
  };
  await upsertSnapshot(guildId, 'EMOJI', emoji.id, payload);
}

export async function saveStickerSnapshot(guildId: string, sticker: Sticker): Promise<void> {
  const payload = {
    name: sticker.name,
    description: sticker.description,
    tags: sticker.tags,
    format: sticker.format,
    url: sticker.url,
  };
  await upsertSnapshot(guildId, 'STICKER', sticker.id, payload);
}

async function upsertSnapshot(
  guildId: string,
  resourceType: 'CHANNEL' | 'ROLE' | 'EMOJI' | 'STICKER',
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
