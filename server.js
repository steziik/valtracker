require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// In-memory state store (use Redis in production)
const oauthStates = new Map();

app.use(express.json());

// OAuth callback
app.get('/auth/riot/callback', async (req, res) => {
  const { code, state } = req.query;
  const discordId = oauthStates.get(state);

  if (!discordId || !code) {
    return res.status(400).send('❌ Invalid OAuth request');
  }
  oauthStates.delete(state);

  try {
    // Exchange code for token
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

    // Get PUUID
    const userRes = await axios.get('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    const puuid = userRes.data.sub;

    // Save to DB
    await pool.query(
      `INSERT INTO users (discord_id, riot_puuid, linked_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (discord_id) DO UPDATE SET riot_puuid = $2`,
      [discordId, puuid]
    );

    res.send(`
      <h2>✅ Account Linked!</h2>
      <p>Your Valorant account is now connected to Discord.</p>
      <p><small>We only store your PUUID (anonymous ID) for privacy.</small></p>
      <p><a href="https://discord.com/channels/@me">Return to Discord</a></p>
    `);
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).send('❌ Linking failed. Please try again.');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 OAuth server running on port ${PORT}`);
});