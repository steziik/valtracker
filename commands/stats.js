const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');
const { fetchPlayerStats } = require('../utils/riotApi');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 View Valorant stats')
    .addSubcommand(subcommand =>
      subcommand
        .setName('general')
        .setDescription('General performance stats')
        .addUserOption(option =>
          option.setName('player').setDescription('Player to lookup (default: you)')
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('player') || interaction.user;

    try {
      const dbRes = await pool.query(
        'SELECT riot_puuid FROM users WHERE discord_id = $1',
        [targetUser.id]
      );

      if (dbRes.rows.length === 0) {
        return interaction.editReply(
          `${targetUser} hasn't linked their Valorant account! Use \`/link\`.`
        );
      }

      const puuid = dbRes.rows[0].riot_puuid;
      const stats = await fetchPlayerStats(puuid);

      if (!stats) {
        return interaction.editReply('Failed to load stats. Try again later.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`${stats.name} #${stats.tag} — ${stats.currentRank}`)
        .setThumbnail(stats.rankIconUrl)
        .addFields(
          { name: 'RR', value: `${stats.rr} RR`, inline: true },
          { name: 'K/D', value: stats.kd.toFixed(2), inline: true },
          { name: 'HS %', value: `${(stats.hs * 100).toFixed(1)}%`, inline: true },
          { name: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, inline: true },
          { name: 'Top Agent', value: `${stats.topAgent} (${stats.agentPlayRate}%)`, inline: true },
          { name: 'Last Played', value: `<t:${Math.floor(stats.lastPlayed / 1000)}:R>`, inline: true },
        )
        .setColor(stats.rankColorHex || 0x000000)
        .setFooter({ text: 'Data from last 20 competitive matches' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Stats error:', error);
      await interaction.editReply('❌ Error loading stats.');
    }
  },
};