import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const protectedRolesData = new SlashCommandBuilder()
  .setName('protectedroles')
  .setDescription('Manage protected roles for strip punishment (Administrator required)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a role to protected list')
      .addRoleOption((opt) => opt.setName('role').setDescription('Role to protect').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a role from protected list')
      .addRoleOption((opt) => opt.setName('role').setDescription('Role to unprotect').setRequired(true))
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('List protected roles'));
