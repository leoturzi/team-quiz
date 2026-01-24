-- Migration: Create questions table
-- Created: 2024
-- Description: Stores all submitted questions and their answers

-- Forward migration
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_text TEXT NOT NULL,
  correct_answer VARCHAR(500) NOT NULL,
  wrong_answer_1 VARCHAR(500) NOT NULL,
  wrong_answer_2 VARCHAR(500) NOT NULL,
  wrong_answer_3 VARCHAR(500) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create GIN index for tag searches
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);


-- Revert migration
-- DROP INDEX IF EXISTS idx_questions_tags CASCADE;
-- DROP TABLE IF EXISTS questions CASCADE;
