require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();

// Share state with bot (in production, use Redis)
if (!global.oauthStates) global.oauthStates = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

app.get('/auth/riot/callback', async (req, res) => {
  const { code, state } = req.query;
  const discordId = global.oauthStates.get(state);

  if (!discordId || !code) {
    return res.status(400).send('❌ Invalid OAuth state or code');
  }
  global.oauthStates.delete(state);

  try {
    const tokenRes = await axios.post('https://auth.riotgames.com/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.BASE_URL}/auth/riot/callback`,
        client_id: process.env.RIOT_CLIENT_ID,
        client_secret: process.env.RIOT_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const userRes = await axios.get('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    const puuid = userRes.data.sub;
    const username = userRes.data.acct.game_name;
    const tag = userRes.data.acct.tag_line;

    await pool.query(
      `INSERT INTO users (discord_id, riot_puuid, riot_tagline, linked_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (discord_id) DO UPDATE SET riot_puuid = $2, riot_tagline = $3`,
      [discordId, puuid, `${username}#${tag}`]
    );

    res.send(`
      <h2>✅ Success!</h2>
      <p>Linked <strong>${username}#${tag}</strong> to your Discord account.</p>
      <p><small>We only store your PUUID (anonymous ID) for privacy.</small></p>
      <a href="https://discord.com/channels/@me">← Back to Discord</a>
    `);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).send('❌ Failed to link account. Please try again.');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 OAuth server listening on port ${PORT}`);
});