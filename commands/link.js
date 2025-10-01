const { SlashCommandBuilder } = require('discord.js');
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
   new SlashCommandBuilder()
    .setName('link')
    .setDescription('🔗 Link your Valorant account (e.g., Steziik#EU1)')
    .addStringOption(option =>
      option.setName('riot_id')
        .setDescription('Your Riot ID: Name#Tag (case-sensitive)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const riotId = interaction.options.getString('riot_id');
    
    if (!riotId.includes('#')) {
      return interaction.reply({
        content: '❌ Invalid format. Use: `Name#Tag` (e.g., `TenZ#Sentinels`)',
        ephemeral: true
      });
    }

    const [name, tag] = riotId.split('#');
    if (!name || !tag) {
      return interaction.reply({ content: '❌ Invalid Name or Tag.', ephemeral: true });
    }

    try {
      // Resolve name#tag → PUUID via HenrikDev
      const res = await axios.get(`https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, {
        timeout: 5000
      });

      const puuid = res.data.data.puuid;
      const displayName = `${res.data.data.name}#${res.data.data.tag}`;

      // Save to DB
      await pool.query(
        `INSERT INTO users (discord_id, riot_puuid, riot_tagline, linked_at) 
         VALUES ($1, $2, $3, NOW()) 
         ON CONFLICT (discord_id) DO UPDATE SET riot_puuid = $2, riot_tagline = $3`,
        [interaction.user.id, puuid, displayName]
      );

      await interaction.reply({
        content: `✅ Linked **${displayName}** to your Discord account!`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Link error:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        await interaction.reply({ content: '❌ Player not found. Check spelling and region.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Failed to link. Try again.', ephemeral: true });
      }
    }
  },
};