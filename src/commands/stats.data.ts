import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const statsData = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show anti-crash incident statistics (Administrator required)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
