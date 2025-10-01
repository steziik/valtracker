require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ content: '❌ Command failed. Try again.', ephemeral: true });
  }
});

client.once('ready', async () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  
  // Register commands globally (takes ~1 hour to propagate)
  try {
    await client.application.commands.set([
      require('./commands/link').data,
      require('./commands/stats').data,
    ]);
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);