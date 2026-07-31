import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { PunishmentMode } from '../config/constants.js';

const punishmentChoices = Object.values(PunishmentMode).map((m) => ({ name: m, value: m }));

export const settingsData = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Configure anti-crash settings')
  .addSubcommand((sub) =>
    sub
      .setName('threshold-set')
      .setDescription('Set the score threshold')
      .addIntegerOption((opt) =>
        opt.setName('value').setDescription('Threshold value').setRequired(true).setMinValue(1).setMaxValue(10_000)
      )
  )
  .addSubcommand((sub) => sub.setName('threshold-show').setDescription('Show current threshold'))
  .addSubcommand((sub) =>
    sub
      .setName('window-set')
      .setDescription('Set the scoring window in seconds')
      .addIntegerOption((opt) =>
        opt.setName('seconds').setDescription('Window in seconds').setRequired(true).setMinValue(1).setMaxValue(86400)
      )
  )
  .addSubcommand((sub) => sub.setName('window-show').setDescription('Show current scoring window'))
  .addSubcommand((sub) =>
    sub
      .setName('logchannel-set')
      .setDescription('Set log channel')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Text channel for alerts')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('logchannel-disable').setDescription('Disable log channel'))
  .addSubcommand((sub) =>
    sub
      .setName('recovery-toggle')
      .setDescription('Enable or disable recovery')
      .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable recovery').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('punishment-mode')
      .setDescription('Set punishment mode')
      .addStringOption((opt) =>
        opt.setName('mode').setDescription('Punishment mode').setRequired(true).addChoices(...punishmentChoices)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('admin-immunity-toggle')
      .setDescription('Enable or disable admin immunity')
      .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable admin immunity').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('ignore-bots-toggle')
      .setDescription('Enable or disable ignoring bot accounts')
      .addBooleanOption((opt) => opt.setName('enabled').setDescription('Enable ignoring bots').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('protected-roles-add')
      .setDescription('Add a role to protected list')
      .addStringOption((opt) =>
        opt.setName('role').setDescription('Role ID or mention').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('protected-roles-remove')
      .setDescription('Remove a role from protected list')
      .addStringOption((opt) =>
        opt.setName('role').setDescription('Role ID or mention').setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('protected-roles-list').setDescription('List protected roles'))
  .addSubcommand((sub) =>
    sub
      .setName('settings-roles-add')
      .setDescription('Add a role allowed to configure settings')
      .addRoleOption((opt) =>
        opt.setName('role').setDescription('Role to allow').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('settings-roles-remove')
      .setDescription('Remove a role from settings access')
      .addRoleOption((opt) =>
        opt.setName('role').setDescription('Role to remove').setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('settings-roles-list').setDescription('List roles allowed to configure settings'))
  .addSubcommand((sub) => sub.setName('view').setDescription('View all settings'));
