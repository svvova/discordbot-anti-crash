import type { CategoryChannelResolvable, Guild } from 'discord.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../infrastructure/prisma.js';
import { redis } from '../../infrastructure/redis.js';
import { logger } from '../../infrastructure/logger.js';

interface ChannelSnapshot {
  type: ChannelType;
  name: string;
  topic?: string | null;
  nsfw?: boolean;
  parentId?: string | null;
  position?: number;
  rateLimitPerUser?: number;
  bitrate?: number;
  userLimit?: number;
  permissionOverwrites?: Array<{ id: string; type: 'role' | 'member'; allow: string; deny: string }>;
}

interface RoleSnapshot {
  name: string;
  color: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  position: number;
}

interface EmojiSnapshot {
  name: string;
  animated: boolean;
  url: string;
  roles: string[];
}

interface StickerSnapshot {
  name: string;
  description: string | null;
  tags: string;
  format: number;
  url: string;
}

const RECOVERY_LOCK_PREFIX = 'anticrash:lock:recovery';
const RECOVERY_LOCK_TTL_MS = 60_000;

export async function acquireRecoveryLock(guildId: string, resourceType: string, resourceId: string): Promise<boolean> {
  const key = `${RECOVERY_LOCK_PREFIX}:${guildId}:${resourceType}:${resourceId}`;
  const result = await redis.set(key, '1', 'PX', RECOVERY_LOCK_TTL_MS, 'NX');
  return result === 'OK';
}

export async function restoreResource(
  guild: Guild,
  resourceType: 'CHANNEL' | 'ROLE' | 'EMOJI' | 'STICKER',
  resourceId: string
): Promise<{ success: boolean; detail: string; newId?: string }> {
  const lockAcquired = await acquireRecoveryLock(guild.id, resourceType, resourceId);
  if (!lockAcquired) {
    return { success: false, detail: 'recovery_in_progress' };
  }

  try {
    const snapshot = await prisma.resourceSnapshot.findFirst({
      where: { guildId: guild.id, resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      return { success: false, detail: 'snapshot_not_found' };
    }

    const me = guild.members.me;
    if (!me) return { success: false, detail: 'bot_not_in_guild' };

    if (resourceType === 'CHANNEL') {
      return await restoreChannel(guild, resourceId, snapshot.payload as unknown as ChannelSnapshot, me.permissions);
    }

    if (resourceType === 'ROLE') {
      return await restoreRole(guild, resourceId, snapshot.payload as unknown as RoleSnapshot, me.roles.highest.position);
    }

    if (resourceType === 'EMOJI') {
      return await restoreEmoji(guild, resourceId, snapshot.payload as unknown as EmojiSnapshot, me.permissions);
    }

    if (resourceType === 'STICKER') {
      return await restoreSticker(guild, resourceId, snapshot.payload as unknown as StickerSnapshot, me.permissions);
    }

    return { success: false, detail: 'unsupported_resource_type' };
  } catch (err) {
    logger.error({ err, guildId: guild.id, resourceType, resourceId }, 'Restore failed');
    return { success: false, detail: 'exception' };
  }
}

async function restoreChannel(
  guild: Guild,
  originalId: string,
  snapshot: ChannelSnapshot,
  botPermissions: { has: (bit: bigint) => boolean } | null
): Promise<{ success: boolean; detail: string; newId?: string }> {
  if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    return { success: false, detail: 'missing_manage_channels' };
  }

  try {
    const created = await guild.channels.create({
      name: snapshot.name,
      type: snapshot.type as unknown as ChannelType.GuildText,
      topic: snapshot.topic ?? undefined,
      nsfw: snapshot.nsfw,
      parent: snapshot.parentId ? (guild.channels.cache.get(snapshot.parentId) as unknown as CategoryChannelResolvable | undefined) ?? null : null,
      position: snapshot.position,
      rateLimitPerUser: snapshot.rateLimitPerUser,
      bitrate: snapshot.bitrate,
      userLimit: snapshot.userLimit,
      permissionOverwrites: snapshot.permissionOverwrites?.map((o) => ({
        id: o.id,
        type: o.type === 'role' ? 0 : 1,
        allow: BigInt(o.allow),
        deny: BigInt(o.deny),
      })),
    });

    await prisma.resourceSnapshot.upsert({
      where: {
        guildId_resourceType_resourceId: { guildId: guild.id, resourceType: 'CHANNEL', resourceId: originalId },
      },
      create: {
        guildId: guild.id,
        resourceType: 'CHANNEL',
        resourceId: originalId,
        payload: { ...snapshot, restoredId: created.id } as object,
        version: 1,
      },
      update: {
        payload: { ...snapshot, restoredId: created.id } as object,
        version: { increment: 1 },
      },
    });

    return { success: true, detail: 'channel_created', newId: created.id };
  } catch (err) {
    logger.error({ err, guildId: guild.id, originalId }, 'Channel restore failed');
    return { success: false, detail: 'channel_create_error' };
  }
}

async function restoreRole(
  guild: Guild,
  originalId: string,
  snapshot: RoleSnapshot,
  botHighestPosition: number
): Promise<{ success: boolean; detail: string; newId?: string }> {
  if (botHighestPosition <= snapshot.position) {
    return { success: false, detail: 'hierarchy_too_low' };
  }

  try {
    const created = await guild.roles.create({
      name: snapshot.name,
      color: snapshot.color,
      permissions: BigInt(snapshot.permissions),
      hoist: snapshot.hoist,
      mentionable: snapshot.mentionable,
      position: Math.min(snapshot.position, botHighestPosition - 1),
    });

    await prisma.resourceSnapshot.upsert({
      where: {
        guildId_resourceType_resourceId: { guildId: guild.id, resourceType: 'ROLE', resourceId: originalId },
      },
      create: {
        guildId: guild.id,
        resourceType: 'ROLE',
        resourceId: originalId,
        payload: { ...snapshot, restoredId: created.id } as object,
        version: 1,
      },
      update: {
        payload: { ...snapshot, restoredId: created.id } as object,
        version: { increment: 1 },
      },
    });

    return { success: true, detail: 'role_created', newId: created.id };
  } catch (err) {
    logger.error({ err, guildId: guild.id, originalId }, 'Role restore failed');
    return { success: false, detail: 'role_create_error' };
  }
}

async function restoreEmoji(
  guild: Guild,
  originalId: string,
  snapshot: EmojiSnapshot,
  botPermissions: { has: (bit: bigint) => boolean } | null
): Promise<{ success: boolean; detail: string; newId?: string }> {
  if (!botPermissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
    return { success: false, detail: 'missing_manage_emojis' };
  }

  try {
    const response = await fetch(snapshot.url);
    if (!response.ok) {
      return { success: false, detail: 'emoji_image_fetch_failed' };
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const created = await guild.emojis.create({
      attachment: buffer,
      name: snapshot.name,
      roles: snapshot.roles,
    });

    await prisma.resourceSnapshot.upsert({
      where: {
        guildId_resourceType_resourceId: { guildId: guild.id, resourceType: 'EMOJI', resourceId: originalId },
      },
      create: {
        guildId: guild.id,
        resourceType: 'EMOJI',
        resourceId: originalId,
        payload: { ...snapshot, restoredId: created.id } as object,
        version: 1,
      },
      update: {
        payload: { ...snapshot, restoredId: created.id } as object,
        version: { increment: 1 },
      },
    });

    return { success: true, detail: 'emoji_created', newId: created.id };
  } catch (err) {
    logger.error({ err, guildId: guild.id, originalId }, 'Emoji restore failed');
    return { success: false, detail: 'emoji_create_error' };
  }
}

async function restoreSticker(
  guild: Guild,
  originalId: string,
  snapshot: StickerSnapshot,
  botPermissions: { has: (bit: bigint) => boolean } | null
): Promise<{ success: boolean; detail: string; newId?: string }> {
  if (!botPermissions?.has(PermissionFlagsBits.ManageGuildExpressions)) {
    return { success: false, detail: 'missing_manage_stickers' };
  }

  try {
    const response = await fetch(snapshot.url);
    if (!response.ok) {
      return { success: false, detail: 'sticker_image_fetch_failed' };
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const created = await guild.stickers.create({
      file: buffer,
      name: snapshot.name,
      tags: snapshot.tags,
      description: snapshot.description ?? undefined,
    });

    await prisma.resourceSnapshot.upsert({
      where: {
        guildId_resourceType_resourceId: { guildId: guild.id, resourceType: 'STICKER', resourceId: originalId },
      },
      create: {
        guildId: guild.id,
        resourceType: 'STICKER',
        resourceId: originalId,
        payload: { ...snapshot, restoredId: created.id } as object,
        version: 1,
      },
      update: {
        payload: { ...snapshot, restoredId: created.id } as object,
        version: { increment: 1 },
      },
    });

    return { success: true, detail: 'sticker_created', newId: created.id };
  } catch (err) {
    logger.error({ err, guildId: guild.id, originalId }, 'Sticker restore failed');
    return { success: false, detail: 'sticker_create_error' };
  }
}
