-- Migration: Create players table
-- Created: 2024
-- Description: Stores player aliases and their cumulative scores

-- Forward migration
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alias VARCHAR(50) UNIQUE NOT NULL,
  total_questions_answered INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for alias lookups
CREATE INDEX IF NOT EXISTS idx_players_alias ON players(alias);

-- Revert migration
-- DROP INDEX IF EXISTS idx_players_alias;
-- DROP TABLE IF EXISTS players;
