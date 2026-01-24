-- Migration: Create answers table
-- Created: 2024
-- Description: Records each player's answer to each question in a session

-- Forward migration
CREATE TABLE IF NOT EXISTS answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  player_id UUID REFERENCES players(id),
  selected_answer VARCHAR(500) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_session_id, question_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_answers_session_question ON answers(quiz_session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON answers(player_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- Revert migration
-- DROP INDEX IF EXISTS idx_answers_question_id;
-- DROP INDEX IF EXISTS idx_answers_player_id;
-- DROP INDEX IF EXISTS idx_answers_session_question;
-- DROP TABLE IF EXISTS answers;
