-- Migration: Add per-question time limits
-- Description: Allows quiz creators to set a custom time limit per question
-- instead of the hardcoded 60-second default.

-- Forward migration
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER NOT NULL DEFAULT 60
  CONSTRAINT time_limit_seconds_min CHECK (time_limit_seconds >= 1);

-- Revert migration
-- ALTER TABLE questions DROP CONSTRAINT IF EXISTS time_limit_seconds_min;
-- ALTER TABLE questions DROP COLUMN IF EXISTS time_limit_seconds;
