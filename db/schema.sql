CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  discord_id TEXT UNIQUE NOT NULL,
  riot_puuid TEXT NOT NULL,
  riot_tagline TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_discord ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_puuid ON users(riot_puuid);