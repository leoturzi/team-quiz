-- Migration: Upgrade questions structure
-- Description: Adds question_type and question_structure columns to support
-- multiple question formats (multiple_choice, true_false, multiple_answer, sequence).
-- Also adds selected_answer_data JSONB to answers for structured responses.

-- Forward migration

-- 1. Add question_type column with constraint
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice'
  CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_answer', 'sequence'));

-- 2. Add question_structure JSONB column
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_structure JSONB;

-- 3. Backfill existing multiple-choice questions into the new structure
UPDATE questions
SET question_structure = jsonb_build_object(
  'options', jsonb_build_array(
    jsonb_build_object('text', correct_answer, 'isCorrect', true),
    jsonb_build_object('text', wrong_answer_1, 'isCorrect', false),
    jsonb_build_object('text', wrong_answer_2, 'isCorrect', false),
    jsonb_build_object('text', wrong_answer_3, 'isCorrect', false)
  )
)
WHERE question_structure IS NULL;

-- 4. Add selected_answer_data JSONB to answers for structured responses
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS selected_answer_data JSONB;

-- 5. Create index on question_type for filtering
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

-- 6. Drop legacy flat columns (data now lives in question_structure)
ALTER TABLE questions DROP COLUMN IF EXISTS correct_answer;
ALTER TABLE questions DROP COLUMN IF EXISTS wrong_answer_1;
ALTER TABLE questions DROP COLUMN IF EXISTS wrong_answer_2;
ALTER TABLE questions DROP COLUMN IF EXISTS wrong_answer_3;


-- Revert migration (run these statements in order to undo)
-- ALTER TABLE questions ADD COLUMN correct_answer VARCHAR(500);
-- ALTER TABLE questions ADD COLUMN wrong_answer_1 VARCHAR(500);
-- ALTER TABLE questions ADD COLUMN wrong_answer_2 VARCHAR(500);
-- ALTER TABLE questions ADD COLUMN wrong_answer_3 VARCHAR(500);
-- UPDATE questions SET
--   correct_answer = (question_structure->'options'->0->>'text'),
--   wrong_answer_1 = (question_structure->'options'->1->>'text'),
--   wrong_answer_2 = (question_structure->'options'->2->>'text'),
--   wrong_answer_3 = (question_structure->'options'->3->>'text')
-- WHERE question_type IN ('multiple_choice', 'true_false', 'multiple_answer');
-- ALTER TABLE answers DROP COLUMN IF EXISTS selected_answer_data;
-- DROP INDEX IF EXISTS idx_questions_type;
-- ALTER TABLE questions DROP COLUMN IF EXISTS question_structure;
-- ALTER TABLE questions DROP COLUMN IF EXISTS question_type;
