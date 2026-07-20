import { Client, Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';
import { logger } from '../../infrastructure/logger.js';
import type { CorrelatedSecurityEvent, SecurityEvent } from '../audit/types.js';
import type { PunishmentResult } from '../punishment/punishment.js';
import { t, type SupportedLanguage } from '../../i18n/index.js';

async function fetchLogChannel(client: Client, guild: Guild): Promise<{ channel: TextChannel; lang: SupportedLanguage } | null> {
  const { prisma } = await import('../../infrastructure/prisma.js');
  const settings = await prisma.serverSettings.findUnique({ where: { guildId: guild.id } });
  const channelId = settings?.logChannelId;
  if (!channelId) return null;
  const lang: SupportedLanguage = (settings?.language as SupportedLanguage) ?? 'en';

  const channel = client.channels.cache.get(channelId) ?? (await client.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    logger.warn({ channelId, guildId: guild.id }, 'Log channel unavailable');
    return null;
  }
  return { channel: channel as TextChannel, lang };
}

export async function notifyLogChannel(
  client: Client,
  guild: Guild,
  event: CorrelatedSecurityEvent,
  score: number,
  threshold: number,
  result: PunishmentResult,
  recoveryResult?: { success: boolean; detail: string }
): Promise<void> {
  const fetched = await fetchLogChannel(client, guild);
  if (!fetched) return;
  const { channel, lang } = fetched;

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
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, channelId: channel.id, guildId: guild.id }, 'Failed to send log embed');
  }
}

export async function notifyScoreUpdate(
  client: Client,
  guild: Guild,
  event: SecurityEvent,
  score: number,
  threshold: number
): Promise<void> {
  const fetched = await fetchLogChannel(client, guild);
  if (!fetched) return;
  const { channel, lang } = fetched;

  const embed = new EmbedBuilder()
    .setColor(Colors.Yellow)
    .setTitle(t(lang, 'scoreUpdate.title'))
    .addFields(
      { name: t(lang, 'incident.action'), value: event.action, inline: true },
      { name: t(lang, 'incident.executor'), value: event.executorId ? `<@${event.executorId}>` : t(lang, 'scoreUpdate.unknownExecutor'), inline: true },
      { name: t(lang, 'incident.target'), value: `${event.resourceType}${event.resourceId ? ` (${event.resourceId})` : ''}`, inline: true },
      { name: t(lang, 'scoreUpdate.weight'), value: String(event.weight), inline: true },
      { name: t(lang, 'incident.scoreThreshold'), value: `${score} / ${threshold}`, inline: false }
    )
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error({ err, channelId: channel.id, guildId: guild.id }, 'Failed to send score update embed');
  }
}
