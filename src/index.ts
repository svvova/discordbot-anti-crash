import { MessageFlags } from 'discord.js';
import { t } from './i18n/index.js';
import { env } from './config/env.js';
import { client, registerCommands } from './client.js';
import { logger } from './infrastructure/logger.js';
import { connectPrisma, disconnectPrisma } from './infrastructure/prisma.js';
import { disconnectRedis } from './infrastructure/redis.js';
import { startHealthServer, stopHealthServer } from './infrastructure/health.js';
import { registerEventHandlers } from './events/index.js';
import { settingsCommand } from './commands/settings.js';
import { statsCommand } from './commands/stats.js';
import { languageCommand } from './commands/language.js';

registerCommands([settingsCommand, statsCommand, languageCommand]);
registerEventHandlers(client);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, 'Command execution failed');
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: t('en', 'errors.commandExecution') });
      } else {
        await interaction.reply({ content: t('en', 'errors.commandExecution'), flags: MessageFlags.Ephemeral });
      }
    } catch {
      // ignore
    }
  }
});

async function bootstrap(): Promise<void> {
  await connectPrisma();
  startHealthServer();
  await client.login(env.DISCORD_TOKEN);
}

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  try {
    client.removeAllListeners();
    await client.destroy();
    await stopHealthServer();
    await disconnectRedis();
    await disconnectPrisma();
  } catch (err) {
    logger.error({ err }, 'Shutdown error');
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

void bootstrap();
