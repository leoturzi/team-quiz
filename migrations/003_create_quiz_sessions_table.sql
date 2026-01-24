-- Migration: Create quiz_sessions table
-- Created: 2024
-- Description: Stores metadata about each quiz game session

-- Forward migration
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lobby_code VARCHAR(10) UNIQUE NOT NULL,
  host_player_id UUID REFERENCES players(id),
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
  current_question_index INTEGER DEFAULT 0,
  question_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_lobby_code ON quiz_sessions(lobby_code);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_host_player_id ON quiz_sessions(host_player_id);

-- Revert migration
-- DROP INDEX IF EXISTS idx_quiz_sessions_host_player_id;
-- DROP INDEX IF EXISTS idx_quiz_sessions_status;
-- DROP INDEX IF EXISTS idx_quiz_sessions_lobby_code;
-- DROP TABLE IF EXISTS quiz_sessions;
