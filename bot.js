require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ content: '❌ Command failed.', ephemeral: true });
  }
});

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    await client.application.commands.set([
      require('./commands/link').data,
      require('./commands/stats').data,
    ]);
    console.log('✅ Commands registered');
  } catch (err) {
    console.error('Command registration failed:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);