import type { Guild } from 'discord.js';
import { PunishmentMode } from '../../config/constants.js';
import { prisma } from '../../infrastructure/prisma.js';
import { logger } from '../../infrastructure/logger.js';
import type { CorrelatedSecurityEvent } from '../audit/types.js';
import { clearScore } from '../scoring/scoring.js';

export interface PunishmentResult {
  success: boolean;
  mode: string;
  detail: string;
}

export async function applyPunishment(
  guild: Guild,
  event: CorrelatedSecurityEvent,
  mode: string,
  timeoutSeconds: number
): Promise<PunishmentResult> {
  const member = await guild.members.fetch(event.executorId).catch(() => null);
  if (!member) {
    return { success: false, mode, detail: 'member_not_found' };
  }

  const bot = guild.members.me;
  if (!bot) {
    return { success: false, mode, detail: 'bot_not_in_guild' };
  }

  if (member.id === guild.ownerId || member.roles.highest.position >= bot.roles.highest.position) {
    return { success: false, mode, detail: 'hierarchy' };
  }

  try {
    switch (mode) {
      case PunishmentMode.WARN:
        return { success: true, mode, detail: 'warned' };
      case PunishmentMode.TIMEOUT:
        if (!bot.permissions.has('ModerateMembers')) {
          return { success: false, mode, detail: 'missing_timeout_permission' };
        }
        await member.timeout(timeoutSeconds * 1000, 'Anti-crash threshold exceeded');
        return { success: true, mode, detail: `timeout_${timeoutSeconds}s` };
      case PunishmentMode.KICK:
        if (!bot.permissions.has('KickMembers')) {
          return { success: false, mode, detail: 'missing_kick_permission' };
        }
        await member.kick('Anti-crash threshold exceeded');
        return { success: true, mode, detail: 'kicked' };
      case PunishmentMode.BAN:
        if (!bot.permissions.has('BanMembers')) {
          return { success: false, mode, detail: 'missing_ban_permission' };
        }
        await member.ban({ reason: 'Anti-crash threshold exceeded' });
        return { success: true, mode, detail: 'banned' };
      default:
        return { success: false, mode, detail: 'unknown_mode' };
    }
  } catch (err) {
    logger.error({ err, userId: event.executorId, guildId: guild.id, mode }, 'Punishment failed');
    return { success: false, mode, detail: 'discord_error' };
  } finally {
    await clearScore(guild.id, event.executorId);
  }
}

export async function persistIncident(
  event: CorrelatedSecurityEvent,
  score: number,
  threshold: number,
  result: PunishmentResult,
  recoveryResult?: { success: boolean; detail: string }
): Promise<void> {
  await prisma.incident.create({
    data: {
      guildId: event.guildId,
      executorId: event.executorId,
      action: event.action,
      targetType: event.resourceType,
      targetId: event.resourceId,
      score,
      threshold,
      punishmentResult: `${result.mode}:${result.detail}`,
      recoveryResult: recoveryResult ? `${recoveryResult.success ? 'ok' : 'fail'}:${recoveryResult.detail}` : null,
      metadata: event.raw as object,
    },
  });
}
