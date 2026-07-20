import { Client, Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { logger } from '../../infrastructure/logger.js';
import type { CorrelatedSecurityEvent } from '../audit/types.js';
import type { PunishmentResult } from '../punishment/punishment.js';
import { t, type SupportedLanguage } from '../../i18n/index.js';

export async function notifyLogChannel(
  client: Client,
  guild: Guild,
  event: CorrelatedSecurityEvent,
  score: number,
  threshold: number,
  result: PunishmentResult,
  recoveryResult?: { success: boolean; detail: string }
): Promise<void> {
  const { prisma } = await import('../../infrastructure/prisma.js');
  const settings = await prisma.serverSettings.findUnique({ where: { guildId: guild.id } });
  const channelId = settings?.logChannelId;
  if (!channelId) return;
  const lang: SupportedLanguage = (settings?.language as SupportedLanguage) ?? 'en';

  const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    logger.warn({ channelId, guildId: guild.id }, 'Log channel unavailable');
    return;
  }

  const recoveryValue = recoveryResult
    ? `${recoveryResult.success ? t(lang, 'incident.recoverySuccess') : t(lang, 'incident.recoveryFailed')}: ${recoveryResult.detail}`
    : t(lang, 'incident.none');
  const embed = new EmbedBuilder()
    .setColor(result.success ? Colors.Red : Colors.Orange)
    .setTitle(t(lang, 'incident.title'))
    .addFields(
      { name: t(lang, 'incident.action'), value: event.action, inline: true },
      { name: t(lang, 'incident.executor'), value: `<@${event.executorId}>`, inline: true },
      { name: t(lang, 'incident.target'), value: `${event.resourceType}${event.resourceId ? ` (${event.resourceId})` : ''}`, inline: true },
      { name: t(lang, 'incident.scoreThreshold'), value: `${score} / ${threshold}`, inline: true },
      { name: t(lang, 'incident.punishment'), value: `${result.mode} — ${result.detail}`, inline: true },
      { name: t(lang, 'incident.recovery'), value: recoveryValue, inline: true },
      { name: t(lang, 'incident.correlationId'), value: event.auditLogEntryId, inline: false }
    )
    .setTimestamp();

  try {
    await (channel as TextChannel).send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, channelId, guildId: guild.id }, 'Failed to send log embed');
  }
}
