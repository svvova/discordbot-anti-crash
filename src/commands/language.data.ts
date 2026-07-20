import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { SupportedLanguages, type SupportedLanguage } from '../i18n/index.js';

const languageChoices = (Object.keys(SupportedLanguages) as SupportedLanguage[]).map((code) => ({
  name: SupportedLanguages[code],
  value: code,
}));

export const languageData = new SlashCommandBuilder()
  .setName('language')
  .setDescription('Set the bot language')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName('code').setDescription('Language code').setRequired(true).addChoices(...languageChoices)
  );
