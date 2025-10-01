const NodeCache = require('node-cache');
const axios = require('axios');

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

// Get player's region (assume NA for MVP)
const getRegion = () => 'na';

// Fetch MMR (rank + RR)
const fetchMMR = async (puuid) => {
  try {
    const res = await axios.get(
      `https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/${getRegion()}/${puuid}`,
      { timeout: 5000 }
    );
    return res.data.data;
  } catch (error) {
    console.error('MMR fetch error:', error.message);
    return null;
  }
};

// Fetch recent matches
const fetchMatches = async (puuid) => {
  try {
    const res = await axios.get(
      `https://api.henrikdev.xyz/valorant/v3/by-puuid/matches/${getRegion()}/${puuid}?filter=competitive&size=20`,
      { timeout: 8000 }
    );
    return res.data.data;
  } catch (error) {
    console.error('Matches fetch error:', error.message);
    return [];
  }
};

// Process stats from matches
const calculateStats = (matches) => {
  if (matches.length === 0) return null;

  let kills = 0, deaths = 0, assists = 0, headshots = 0, rounds = 0, wins = 0;
  const agentCounts = {};

  for (const match of matches) {
    const player = match.players.find(p => p.puuid === match.metadata.puuid);
    if (!player) continue;

    kills += player.stats.kills;
    deaths += player.stats.deaths;
    assists += player.stats.assists;
    headshots += player.stats.headshots;
    rounds += match.metadata.rounds_played;
    if (match.teams[match.metadata.team].rounds_won > match.teams[match.metadata.team === 'Blue' ? 'Red' : 'Blue'].rounds_won) {
      wins++;
    }

    const agent = player.character;
    agentCounts[agent] = (agentCounts[agent] || 0) + 1;
  }

  const kd = deaths > 0 ? kills / deaths : kills;
  const hs = kills > 0 ? headshots / kills : 0;
  const winRate = (wins / matches.length) * 100;

  const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];
  const agentPlayRate = topAgent ? Math.round((topAgent[1] / matches.length) * 100) : 0;

  return {
    kd,
    hs,
    winRate,
    topAgent: topAgent ? topAgent[0] : 'N/A',
    agentPlayRate,
    lastPlayed: matches[0]?.metadata.game_start_pst * 1000 || Date.now(),
  };
};

// Public function
exports.fetchPlayerCompetitiveStats = async (puuid) => {
  const cacheKey = `stats_${puuid}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch MMR
  const mmrData = await fetchMMR(puuid);
  if (!mmrData || !mmrData.currenttierpatched) return null;

  // Fetch matches
  const matches = await fetchMatches(puuid);
  const stats = calculateStats(matches);
  if (!stats) return null;

  const result = {
    name: mmrData.name,
    tag: mmrData.tag,
    currentRank: mmrData.currenttierpatched,
    rr: mmrData.ranking_in_tier || 0,
    rankIconUrl: mmrData.images?.small || '',
    ...stats,
  };

  cache.set(cacheKey, result);
  return result;
};