const NodeCache = require('node-cache');
const axios = require('axios');

// In-memory cache (TTL: 10 mins for stats)
const cache = new NodeCache({ stdTTL: 600 });

// Mock data for MVP — replace with real Riot API calls later
exports.fetchPlayerStats = async (puuid) => {
  const cached = cache.get(puuid);
  if (cached) return cached;

  // TODO: Replace with real Riot API call
  const mockStats = {
    name: 'Player',
    tag: '12345',
    currentRank: 'Platinum 2',
    rr: 72,
    kd: 1.32,
    hs: 0.28,
    winRate: 54.3,
    topAgent: 'Jett',
    agentPlayRate: 68,
    lastPlayed: Date.now() - 3600000, // 1 hour ago
    rankIconUrl: 'https://trackercdn.com/cdn/valorant-api.com/ranks/platinum2.png',
    rankColorHex: 0x4A90E2,
  };

  cache.set(puuid, mockStats);
  return mockStats;
};