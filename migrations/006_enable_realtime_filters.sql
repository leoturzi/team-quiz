-- Migration: Enable Realtime for quiz tables
-- Description: Enables RLS with SELECT policies required for postgres_changes to work

-- Forward migration

-- Enable RLS on tables (required for postgres_changes)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create permissive SELECT policies for anonymous users (required for realtime)
CREATE POLICY "Allow anonymous read access on quiz_sessions"
ON quiz_sessions FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous read access on quiz_participants"
ON quiz_participants FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous read access on answers"
ON answers FOR SELECT
TO anon
USING (true);

-- Also allow INSERT/UPDATE for the app to work
CREATE POLICY "Allow anonymous insert on quiz_sessions"
ON quiz_sessions FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous update on quiz_sessions"
ON quiz_sessions FOR UPDATE
TO anon
USING (true);

CREATE POLICY "Allow anonymous delete on quiz_sessions"
ON quiz_sessions FOR DELETE
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert on quiz_participants"
ON quiz_participants FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on answers"
ON answers FOR INSERT
TO anon
WITH CHECK (true);

-- Set REPLICA IDENTITY to FULL for complete change data
ALTER TABLE quiz_sessions REPLICA IDENTITY FULL;
ALTER TABLE quiz_participants REPLICA IDENTITY FULL;
ALTER TABLE answers REPLICA IDENTITY FULL;

-- Revert migration (uncomment to run)
-- DROP POLICY IF EXISTS "Allow anonymous read access on quiz_sessions" ON quiz_sessions;
-- DROP POLICY IF EXISTS "Allow anonymous read access on quiz_participants" ON quiz_participants;
-- DROP POLICY IF EXISTS "Allow anonymous read access on answers" ON answers;
-- DROP POLICY IF EXISTS "Allow anonymous insert on quiz_sessions" ON quiz_sessions;
-- DROP POLICY IF EXISTS "Allow anonymous update on quiz_sessions" ON quiz_sessions;
-- DROP POLICY IF EXISTS "Allow anonymous delete on quiz_sessions" ON quiz_sessions;
-- DROP POLICY IF EXISTS "Allow anonymous insert on quiz_participants" ON quiz_participants;
-- DROP POLICY IF EXISTS "Allow anonymous insert on answers" ON answers;
-- ALTER TABLE quiz_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
