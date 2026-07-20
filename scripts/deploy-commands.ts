import { REST, Routes } from 'discord.js';
import { env } from '../src/config/env.js';
import { settingsData } from '../src/commands/settings.data.js';
import { statsData } from '../src/commands/stats.data.js';
import { languageData } from '../src/commands/language.data.js';
import { protectedRolesData } from '../src/commands/protectedroles.data.js';

const commands = [settingsData.toJSON(), statsData.toJSON(), languageData.toJSON(), protectedRolesData.toJSON()];
const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands`);
    if (env.DISCORD_DEV_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID),
        { body: commands }
      );
      console.log(`Deployed guild commands to ${env.DISCORD_DEV_GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commands });
      console.log('Deployed global commands');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
