# Skill: Supabase Migrations

## When to Use

Use this skill whenever a task requires creating, modifying, or dropping database tables or columns. This applies to both feature work and bug fixes that touch the schema.

## Migration Directory

All migrations live in the project root `migrations/` directory — **not** in `supabase/migrations/`.

```
migrations/
  001_create_players_table.sql
  002_create_questions_table.sql
  ...
```

## Naming Convention

```
<NNN>_<short_snake_case_description>.sql
```

- `NNN` is a zero-padded sequential number. Check existing files to determine the next number.
- Description should be concise: `add_time_limit_to_questions`, `create_answers_table`, `drop_legacy_columns`.

## File Format

Every migration file must contain three sections in this order:

```sql
-- Migration: <Title>
-- Description: <One or two sentences explaining what this migration does and why>

-- Forward migration
<SQL statements to apply the change>

-- Revert migration
-- <Commented-out SQL statements to undo the change>
```

### Rules

1. **Header comments** are mandatory. The `Migration:` line is a short title; `Description:` explains the purpose.
2. **Forward migration** contains the executable SQL. Use `IF NOT EXISTS` / `IF EXISTS` guards where possible to make re-runs safe.
3. **Revert migration** contains the inverse SQL, fully commented out (`--` prefix on every line). The revert must undo the forward migration completely, in reverse order. If the forward adds a column and a constraint, the revert drops the constraint first, then the column.
4. If the migration includes a **backfill** `UPDATE` statement, note that the revert cannot undo data changes — add a comment explaining this.

## Example

```sql
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
```

## Applying Migrations

Migrations are applied manually via the Supabase SQL Editor (Dashboard → SQL Editor). Copy-paste the forward migration section and run it. The Supabase MCP does not currently have access to execute migrations directly.
