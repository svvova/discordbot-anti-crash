import type { Collection, Guild, GuildAuditLogsEntry } from 'discord.js';
import { AuditLogEvent } from 'discord.js';
import { logger } from '../../infrastructure/logger.js';
import type { CorrelationResult, SecurityEvent } from './types.js';

const RETRIES = 5;
const INITIAL_DELAY_MS = 200;

const actionToAuditEvent: Record<string, AuditLogEvent> = {
  GUILD_UPDATE: AuditLogEvent.GuildUpdate,
  ROLE_CREATE: AuditLogEvent.RoleCreate,
  ROLE_DELETE: AuditLogEvent.RoleDelete,
  ROLE_UPDATE: AuditLogEvent.RoleUpdate,
  CHANNEL_CREATE: AuditLogEvent.ChannelCreate,
  CHANNEL_DELETE: AuditLogEvent.ChannelDelete,
  CHANNEL_UPDATE: AuditLogEvent.ChannelUpdate,
  CHANNEL_OVERWRITE_CREATE: AuditLogEvent.ChannelOverwriteCreate,
  CHANNEL_OVERWRITE_UPDATE: AuditLogEvent.ChannelOverwriteUpdate,
  CHANNEL_OVERWRITE_DELETE: AuditLogEvent.ChannelOverwriteDelete,
  WEBHOOK_CREATE: AuditLogEvent.WebhookCreate,
  WEBHOOK_DELETE: AuditLogEvent.WebhookDelete,
  WEBHOOK_UPDATE: AuditLogEvent.WebhookUpdate,
  MEMBER_ROLE_UPDATE: AuditLogEvent.MemberRoleUpdate,
  MEMBER_BAN_ADD: AuditLogEvent.MemberBanAdd,
  MEMBER_KICK: AuditLogEvent.MemberKick,
  EMOJI_CREATE: AuditLogEvent.EmojiCreate,
  EMOJI_DELETE: AuditLogEvent.EmojiDelete,
  EMOJI_UPDATE: AuditLogEvent.EmojiUpdate,
  STICKER_CREATE: AuditLogEvent.StickerCreate,
  STICKER_DELETE: AuditLogEvent.StickerDelete,
  STICKER_UPDATE: AuditLogEvent.StickerUpdate,
};

export async function correlate(event: SecurityEvent, guild: Guild): Promise<CorrelationResult> {
  const auditEvent = actionToAuditEvent[event.action];
  if (!auditEvent) {
    return { event, reason: 'unsupported_action' };
  }

  let delay = INITIAL_DELAY_MS;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const logs = await guild.fetchAuditLogs({ type: auditEvent, limit: 10 });
      const match = findMatchingEntry(event, logs.entries);
      if (match) {
        return {
          event,
          correlationId: match.entry.id,
          executorId: match.entry.executorId ?? undefined,
        };
      }
    } catch (err) {
      logger.warn({ err, attempt, guildId: guild.id, action: event.action }, 'Audit log fetch failed');
    }
    if (attempt < RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  return { event, reason: 'no_correlation' };
}

function getTargetId(entry: GuildAuditLogsEntry): string | undefined {
  const target = entry.target;
  if (!target || typeof target !== 'object') return entry.targetId ?? undefined;
  return 'id' in target && typeof target.id === 'string' ? target.id : entry.targetId ?? undefined;
}

function findMatchingEntry(
  event: SecurityEvent,
  entries: Collection<string, GuildAuditLogsEntry>
): { entry: GuildAuditLogsEntry } | null {
  const now = Date.now();
  const candidates: GuildAuditLogsEntry[] = [];
  for (const entry of entries.values()) {
    const entryTime = entry.createdTimestamp;
    if (Math.abs(entryTime - now) <= 8000 || Math.abs(entryTime - event.timestamp) <= 8000) {
      candidates.push(entry);
    }
  }

  if (event.resourceId) {
    const exact = candidates.find((e) => getTargetId(e) === event.resourceId);
    if (exact) return { entry: exact };
  }

  return null;
}
