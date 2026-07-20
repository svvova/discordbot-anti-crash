import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getSettings, upsertSettings } from '../services/settings/settings.js';
import { isSupportedLanguage, SupportedLanguages, t, type SupportedLanguage } from '../i18n/index.js';
import type { Command } from './types.js';
import { languageData } from './language.data.js';

export const languageCommand: Command = {
  data: languageData,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const lang: SupportedLanguage = guild ? ((await getSettings(guild.id)).language as SupportedLanguage) : 'en';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: t(lang, 'common.adminOnly') });
      return;
    }

    const code = interaction.options.getString('code', true);
    if (!isSupportedLanguage(code)) {
      await interaction.editReply({
        content: t(lang, 'language.invalid', { languages: Object.keys(SupportedLanguages).join(', ') }),
      });
      return;
    }

    await upsertSettings(guild.id, { language: code });
    await interaction.editReply({
      content: t(code, 'language.set', { language: SupportedLanguages[code] }),
    });
  },
};
