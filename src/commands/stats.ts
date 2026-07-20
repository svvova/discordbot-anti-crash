import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../infrastructure/prisma.js';
import { t, type SupportedLanguage } from '../i18n/index.js';
import { getSettings } from '../services/settings/settings.js';
import type { Command } from './types.js';
import { statsData } from './stats.data.js';

export const statsCommand: Command = {
  data: statsData,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const lang: SupportedLanguage = guild ? ((await getSettings(guild.id)).language as SupportedLanguage) : 'en';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: t(lang, 'common.adminOnly') });
      return;
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, day, week] = await Promise.all([
      prisma.incident.count({ where: { guildId: guild.id } }),
      prisma.incident.count({ where: { guildId: guild.id, createdAt: { gte: dayAgo } } }),
      prisma.incident.count({ where: { guildId: guild.id, createdAt: { gte: weekAgo } } }),
    ]);

    const byAction = await prisma.incident.groupBy({
      by: ['action'],
      where: { guildId: guild.id },
      _count: { action: true },
    });

    const byPunishment = await prisma.incident.groupBy({
      by: ['punishmentResult'],
      where: { guildId: guild.id },
      _count: { punishmentResult: true },
    });

    const actionLines = byAction.map((a: { action: string; _count: { action: number } }) => `- ${a.action}: ${a._count.action}`).join('\n') || t(lang, 'stats.none');
    const punishmentLines = byPunishment
      .filter((p: { punishmentResult: string | null }) => p.punishmentResult)
      .map((p: { punishmentResult: string | null; _count: { punishmentResult: number } }) => `- ${p.punishmentResult}: ${p._count.punishmentResult}`)
      .join('\n') || t(lang, 'stats.none');

    await interaction.editReply({
      content: [
        `**${t(lang, 'stats.title')}**`,
        `${t(lang, 'stats.total')}: ${total}`,
        `${t(lang, 'stats.last24h')}: ${day}`,
        `${t(lang, 'stats.last7d')}: ${week}`,
        '',
        `${t(lang, 'stats.byAction')}:\n${actionLines}`,
        '',
        `${t(lang, 'stats.byPunishment')}:\n${punishmentLines}`,
      ].join('\n'),
    });
  },
};
