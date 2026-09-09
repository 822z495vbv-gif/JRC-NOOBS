const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// 1. Define your Slash Commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
].map(command => command.toJSON());

// 2. Initialize the Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 3. Register commands with Discord API on startup
client.once('ready', async () => {
  console.log(`LoggedIn as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Registering slash commands with Discord API...');

    // Registers commands globally across all servers
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log('Successfully registered global slash commands!');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

// 4. Handle Slash Command interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! XGFX Bot is online and ready.');
  }
});

// 5. Log in using your environment variable
client.login(process.env.DISCORD_TOKEN);
