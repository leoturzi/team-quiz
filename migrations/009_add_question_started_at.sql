-- Migration: Add per-question start timestamp
-- Description: Tracks when each question started so the timer can survive page reloads

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS current_question_started_at TIMESTAMP WITH TIME ZONE;

-- Backfill in-progress sessions at question 0 with started_at
UPDATE quiz_sessions
SET current_question_started_at = started_at
WHERE status = 'in_progress'
  AND current_question_index = 0
  AND current_question_started_at IS NULL;

-- Revert migration
-- ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS current_question_started_at;
