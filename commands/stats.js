const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const { fetchPlayerStats } = require('../utils/riotApi');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const RANK_COLORS = {
  'unrated': 0x808080,
  'iron': 0x5a5a5a,
  'bronze': 0xcd7f32,
  'silver': 0xc0c0c0,
  'gold': 0xffd700,
  'platinum': 0x00ffff,
  'diamond': 0x0000ff,
  'ascendant': 0x8a2be2,
  'immortal': 0xff007f,
  'radiant': 0xffff00,
};

module.exports = {
   new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 View Valorant stats')
    .addSubcommand(subcommand =>
      subcommand
        .setName('general')
        .setDescription('General stats')
        .addUserOption(option => option.setName('player').setDescription('Player to lookup'))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('player') || interaction.user;

    try {
      const dbRes = await pool.query(
        'SELECT riot_puuid, riot_tagline FROM users WHERE discord_id = $1',
        [target.id]
      );

      if (dbRes.rows.length === 0) {
        return interaction.editReply(`${target} hasn't linked their account! Use \`/link Name#Tag\`.`);
      }

      const { riot_puuid: puuid, riot_tagline: displayName } = dbRes.rows[0];
      const stats = await fetchPlayerStats(puuid);

      if (!stats) {
        return interaction.editReply(`No competitive stats found for ${displayName}.`);
      }

      const rankKey = stats.currentRank.toLowerCase().split(' ')[0];
      const color = RANK_COLORS[rankKey] || 0x000000;

      const embed = new EmbedBuilder()
        .setTitle(`${displayName} — ${stats.currentRank}`)
        .setThumbnail(stats.rankIconUrl)
        .addFields(
          { name: 'RR', value: `${stats.rr} RR`, inline: true },
          { name: 'K/D', value: stats.kd.toFixed(2), inline: true },
          { name: 'HS %', value: `${(stats.hs * 100).toFixed(1)}%`, inline: true },
          { name: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, inline: true },
          { name: 'Top Agent', value: `${stats.topAgent} (${stats.agentPlayRate}%)`, inline: true },
          { name: 'Last Played', value: `<t:${Math.floor(stats.lastPlayed / 1000)}:R>`, inline: true },
        )
        .setColor(color)
        .setFooter({ text: 'Based on last 20 competitive matches' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Stats error:', error);
      await interaction.editReply('❌ Failed to load stats.');
    }
  },
};