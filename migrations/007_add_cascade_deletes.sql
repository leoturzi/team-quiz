-- Migration: Add ON DELETE CASCADE to player and question foreign keys
-- Description: Allows deleting players and questions without being blocked
--  by references in quiz_sessions, quiz_participants, and answers.
-- Postgres requires dropping and re-creating the constraint to change the action.

-- Forward migration

-- 1. quiz_sessions.host_player_id → players(id)
--    SET NULL so deleting a player doesn't destroy the session history.
ALTER TABLE quiz_sessions
  DROP CONSTRAINT quiz_sessions_host_player_id_fkey,
  ADD CONSTRAINT quiz_sessions_host_player_id_fkey
    FOREIGN KEY (host_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- 2. quiz_participants.player_id → players(id)
ALTER TABLE quiz_participants
  DROP CONSTRAINT quiz_participants_player_id_fkey,
  ADD CONSTRAINT quiz_participants_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- 3. answers.player_id → players(id)
ALTER TABLE answers
  DROP CONSTRAINT answers_player_id_fkey,
  ADD CONSTRAINT answers_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- 4. answers.question_id → questions(id)
--    Constraint never existed in the DB. Clean up orphaned rows first,
--    then add the FK.
DELETE FROM answers
  WHERE question_id IS NOT NULL
    AND question_id NOT IN (SELECT id FROM questions);

ALTER TABLE answers
  ADD CONSTRAINT answers_question_id_fkey
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;


-- Revert migration
-- ALTER TABLE quiz_sessions
--   DROP CONSTRAINT quiz_sessions_host_player_id_fkey,
--   ADD CONSTRAINT quiz_sessions_host_player_id_fkey
--     FOREIGN KEY (host_player_id) REFERENCES players(id);
--
-- ALTER TABLE quiz_participants
--   DROP CONSTRAINT quiz_participants_player_id_fkey,
--   ADD CONSTRAINT quiz_participants_player_id_fkey
--     FOREIGN KEY (player_id) REFERENCES players(id);
--
-- ALTER TABLE answers
--   DROP CONSTRAINT answers_player_id_fkey,
--   ADD CONSTRAINT answers_player_id_fkey
--     FOREIGN KEY (player_id) REFERENCES players(id);
--
-- ALTER TABLE answers
--   DROP CONSTRAINT answers_question_id_fkey;
