-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  riot_puuid TEXT NOT NULL,
  riot_tagline TEXT,
  platform TEXT DEFAULT 'pc',
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: matches cache
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  riot_puuid TEXT NOT NULL,
  summary_json JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_puuid ON users(riot_puuid);
CREATE INDEX IF NOT EXISTS idx_matches_puuid ON matches(riot_puuid);