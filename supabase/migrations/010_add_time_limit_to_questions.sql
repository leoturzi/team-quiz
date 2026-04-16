ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER NOT NULL DEFAULT 60
  CONSTRAINT time_limit_seconds_min CHECK (time_limit_seconds >= 1);
