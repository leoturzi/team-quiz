-- Migration: Create quiz_participants table
-- Created: 2024
-- Description: Tracks which players joined a quiz session

-- Forward migration
CREATE TABLE IF NOT EXISTS quiz_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_session_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_id ON quiz_participants(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_player_id ON quiz_participants(player_id);

-- Revert migration
-- DROP INDEX IF EXISTS idx_quiz_participants_player_id;
-- DROP INDEX IF EXISTS idx_quiz_participants_session_id;
-- DROP TABLE IF EXISTS quiz_participants;
