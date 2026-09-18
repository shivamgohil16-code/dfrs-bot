require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('logpatrol')
    .setDescription('Log quota time for a member on the ORBAT')
    .addStringOption((opt) =>
      opt
        .setName('username')
        .setDescription('Username exactly as it appears on the ORBAT sheet')
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('seconds')
        .setDescription('Seconds shown on the in-game stopwatch')
        .setRequired(true)
        .setMinValue(1)
    )
    .addAttachmentOption((opt) =>
      opt
        .setName('screenshot')
        .setDescription('Stopwatch screenshot as proof (optional)')
        .setRequired(false)
    ),
].map((c) => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.CLIENT_ID) {
      throw new Error('CLIENT_ID is missing from your .env file.');
    }

    if (process.env.GUILD_ID) {
      console.log('Registering /logpatrol to guild', process.env.GUILD_ID, '...');
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('Done. The command should appear immediately in that server.');
    } else {
      console.log('Registering /logpatrol globally...');
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log('Done. Global commands can take up to an hour to show up everywhere.');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
