import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { logger } from './infrastructure/logger.js';
import type { Command } from './commands/types.js';
import { createSnapshot } from './services/recovery/snapshot.js';
import { populateWebhookCache } from './events/index.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildWebhooks,
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
  for (const guild of client.guilds.cache.values()) {
    void createSnapshot(guild, 'GUILD').catch((e) =>
      logger.error({ err: e, guildId: guild.id }, 'Initial guild snapshot failed')
    );
    void populateWebhookCache(guild).catch((e) =>
      logger.error({ err: e, guildId: guild.id }, 'Initial webhook cache population failed')
    );
  }
  void client.application?.commands.set(client.commands.map((c) => c.data)).then((cmds) => {
    logger.info({ count: cmds.size }, 'Slash commands registered globally');
  }).catch((e) => {
    logger.error({ err: e }, 'Failed to register slash commands');
  });
});

client.on('guildCreate', (guild) => {
  void createSnapshot(guild, 'GUILD').catch((e) =>
    logger.error({ err: e, guildId: guild.id }, 'Guild create snapshot failed')
  );
  void populateWebhookCache(guild).catch((e) =>
    logger.error({ err: e, guildId: guild.id }, 'Guild create webhook cache population failed')
  );
});

client.on('error', (err) => {
  logger.error({ err }, 'Discord client error');
});
