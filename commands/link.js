const { SlashCommandBuilder } = require('discord.js');
const { generatePrivacyNotice } = require('../utils/privacy');
const crypto = require('crypto');

// Share state with server.js (in production, use Redis)
if (!global.oauthStates) global.oauthStates = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('🔗 Link your Valorant account via Riot Sign On'),

  async execute(interaction) {
    const state = crypto.randomBytes(16).toString('hex');
    global.oauthStates.set(state, interaction.user.id);

    const authUrl = `https://auth.riotgames.com/authorize?` + new URLSearchParams({
      client_id: process.env.RIOT_CLIENT_ID,
      redirect_uri: `${process.env.BASE_URL}/auth/riot/callback`,
      response_type: 'code',
      scope: 'openid',
      state: state,
    });

    await interaction.reply({
      content: `🔒 **Secure Account Linking**\n\n${generatePrivacyNotice('short')}\n\n[Click here to link](${authUrl})`,
      ephemeral: true,
    });
  },
};