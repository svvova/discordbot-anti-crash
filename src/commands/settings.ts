import { ChatInputCommandInteraction, Guild, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getSettings, upsertSettings } from '../services/settings/settings.js';
import { PunishmentMode } from '../config/constants.js';
import { t, type SupportedLanguage } from '../i18n/index.js';
import type { Command } from './types.js';
import { settingsData } from './settings.data.js';

export const settingsCommand: Command = {
  data: settingsData,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!guild || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({ content: t('en', 'common.adminOnly') });
      return;
    }

    const s = await getSettings(guild.id);
    const lang: SupportedLanguage = (s.language as SupportedLanguage) ?? 'en';

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'view') {
      const perms = checkBotPermissions(guild);
      const logChannel = s.logChannelId ? `<#${s.logChannelId}>` : t(lang, 'settings.view.logChannelDisabled');
      const missing = perms.length ? perms.join(', ') : t(lang, 'settings.view.none');
      await interaction.editReply({
        content: [
          `**${t(lang, 'settings.view.title', { guild: guild.name })}**`,
          `${t(lang, 'settings.view.threshold')}: ${s.threshold}`,
          `${t(lang, 'settings.view.logChannel')}: ${logChannel}`,
          `${t(lang, 'settings.view.recovery')}: ${s.recoveryEnabled}`,
          `${t(lang, 'settings.view.adminImmunity')}: ${s.adminImmunityEnabled}`,
          `${t(lang, 'settings.view.punishment')}: ${s.punishmentMode}`,
          `${t(lang, 'settings.view.timeout')}: ${s.timeoutSeconds}s`,
          `${t(lang, 'settings.view.protectedRoles')}: ${s.protectedRoleIds.length ? s.protectedRoleIds.map((id: string) => `<@&${id}>`).join(', ') : t(lang, 'settings.view.none')}`,
          '',
          `${t(lang, 'settings.view.missingBotPerms')}: ${missing}`,
        ].join('\n'),
      });
      return;
    }

    if (sub === 'threshold-set') {
      const value = interaction.options.getInteger('value', true);
      await upsertSettings(guild.id, { threshold: value });
      await interaction.editReply({ content: t(lang, 'settings.thresholdSet', { value }) });
      return;
    }

    if (sub === 'threshold-show') {
      await interaction.editReply({ content: t(lang, 'settings.thresholdShow', { threshold: s.threshold }) });
      return;
    }

    if (sub === 'logchannel-set') {
      const channel = interaction.options.getChannel('channel', true);
      await upsertSettings(guild.id, { logChannelId: channel.id });
      await interaction.editReply({ content: t(lang, 'settings.logChannelSet', { channel: `<#${channel.id}>` }) });
      return;
    }

    if (sub === 'logchannel-disable') {
      await upsertSettings(guild.id, { logChannelId: null });
      await interaction.editReply({ content: t(lang, 'settings.logChannelDisable') });
      return;
    }

    if (sub === 'recovery-toggle') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await upsertSettings(guild.id, { recoveryEnabled: enabled });
      const stateKey = enabled ? 'settings.recoveryEnabled' : 'settings.recoveryDisabled';
      await interaction.editReply({ content: t(lang, 'settings.recoveryToggle', { state: t(lang, stateKey) }) });
      return;
    }

    if (sub === 'punishment-mode') {
      const mode = interaction.options.getString('mode', true);
      if (!Object.values(PunishmentMode).includes(mode as (typeof PunishmentMode)[keyof typeof PunishmentMode])) {
        await interaction.editReply({ content: t(lang, 'settings.punishmentInvalid') });
        return;
      }
      await upsertSettings(guild.id, { punishmentMode: mode });
      await interaction.editReply({ content: t(lang, 'settings.punishmentSet', { mode }) });
      return;
    }

    if (sub === 'admin-immunity-toggle') {
      const enabled = interaction.options.getBoolean('enabled', true);
      await upsertSettings(guild.id, { adminImmunityEnabled: enabled });
      const stateKey = enabled ? 'settings.adminImmunityEnabled' : 'settings.adminImmunityDisabled';
      await interaction.editReply({ content: t(lang, 'settings.adminImmunityToggle', { state: t(lang, stateKey) }) });
      return;
    }

    if (sub === 'protected-roles-add') {
      const roleId = parseRoleId(interaction.options.getString('role', true));
      if (!roleId) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.invalidId') });
        return;
      }
      const protectedIds = new Set(s.protectedRoleIds);
      if (protectedIds.has(roleId)) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.alreadyAdded', { role: `<@&${roleId}>` }) });
        return;
      }
      protectedIds.add(roleId);
      await upsertSettings(guild.id, { protectedRoleIds: Array.from(protectedIds) });
      await interaction.editReply({ content: t(lang, 'protectedRoles.added', { role: `<@&${roleId}>` }) });
      return;
    }

    if (sub === 'protected-roles-remove') {
      const roleId = parseRoleId(interaction.options.getString('role', true));
      if (!roleId) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.invalidId') });
        return;
      }
      const protectedIds = new Set(s.protectedRoleIds);
      if (!protectedIds.has(roleId)) {
        await interaction.editReply({ content: t(lang, 'protectedRoles.notFound', { role: `<@&${roleId}>` }) });
        return;
      }
      protectedIds.delete(roleId);
      await upsertSettings(guild.id, { protectedRoleIds: Array.from(protectedIds) });
      await interaction.editReply({ content: t(lang, 'protectedRoles.removed', { role: `<@&${roleId}>` }) });
      return;
    }

    if (sub === 'protected-roles-list') {
      const list = s.protectedRoleIds.length
        ? s.protectedRoleIds.map((id: string) => `<@&${id}>`).join(', ')
        : t(lang, 'protectedRoles.empty');
      await interaction.editReply({ content: `${t(lang, 'protectedRoles.title')}:\n${list}` });
      return;
    }

    await interaction.editReply({ content: t(lang, 'commands.unknownSubcommand') });
  },
};

function checkBotPermissions(guild: Guild): string[] {
  const me = guild.members.me;
  if (!me) return ['bot_not_in_guild'];
  const missing: string[] = [];
  const required = [
    'ViewAuditLog',
    'ManageRoles',
    'ManageChannels',
    'ManageWebhooks',
    'KickMembers',
    'BanMembers',
    'ModerateMembers',
  ] as const;
  for (const perm of required) {
    if (!me.permissions.has(perm)) missing.push(perm);
  }
  return missing;
}

function parseRoleId(input: string): string | null {
  const clean = input.trim();
  const match = clean.match(/^<@&(\d+)>$/) ?? clean.match(/^(\d{17,21})$/);
  return match ? match[1] : null;
}
