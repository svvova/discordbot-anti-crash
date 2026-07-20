import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getSettings, upsertSettings } from '../services/settings/settings.js';
import { t, type SupportedLanguage } from '../i18n/index.js';
import type { Command } from './types.js';
import { protectedRolesData } from './protectedroles.data.js';

export const protectedRolesCommand: Command = {
  data: protectedRolesData,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    const lang: SupportedLanguage = guild ? ((await getSettings(guild.id)).language as SupportedLanguage) : 'en';
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: t(lang, 'common.adminOnly') });
      return;
    }

    const sub = interaction.options.getSubcommand(true);
    const s = await getSettings(guild.id);
    const protectedIds = new Set(s.protectedRoleIds);

    if (sub === 'add') {
      const role = interaction.options.getRole('role', true);
      if (protectedIds.has(role.id)) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.alreadyAdded', { role: `<@&${role.id}>` }) });
        return;
      }
      protectedIds.add(role.id);
      await upsertSettings(guild.id, { protectedRoleIds: Array.from(protectedIds) });
      await interaction.editReply({ content: t(lang, 'protectedRoles.added', { role: `<@&${role.id}>` }) });
      return;
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role', true);
      if (!protectedIds.has(role.id)) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.notFound', { role: `<@&${role.id}>` }) });
        return;
      }
      protectedIds.delete(role.id);
      await upsertSettings(guild.id, { protectedRoleIds: Array.from(protectedIds) });
      await interaction.editReply({ content: t(lang, 'protectedRoles.removed', { role: `<@&${role.id}>` }) });
      return;
    }

    if (sub === 'list') {
      const list = s.protectedRoleIds.length ? s.protectedRoleIds.map((id: string) => `<@&${id}>`).join(', ') : t(lang, 'protectedRoles.empty');
      await interaction.editReply({ content: `${t(lang, 'protectedRoles.title')}:\n${list}` });
      return;
    }

    await interaction.editReply({ content: t(lang, 'commands.unknownSubcommand') });
  },
};
