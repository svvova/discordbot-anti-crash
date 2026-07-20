import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from './infrastructure/logger.js';
import type { Command } from './commands/types.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildExpressions,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.commands = new Collection<string, Command>();

export function registerCommands(commands: Command[]): void {
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }
}

client.on('clientReady', () => {
  logger.info({ user: client.user?.tag, id: client.user?.id }, 'Bot ready');
});

client.on('error', (err) => {
  logger.error({ err }, 'Discord client error');
});
