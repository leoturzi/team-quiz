# Database Migrations

This folder contains SQL migration files for the GDP Quiz Game database schema.

## Migration Files

Each migration file follows the naming convention: `XXX_description.sql`

- `001_create_players_table.sql` - Creates the players table
- `002_create_questions_table.sql` - Creates the questions table
- `003_create_quiz_sessions_table.sql` - Creates the quiz_sessions table
- `004_create_quiz_participants_table.sql` - Creates the quiz_participants table
- `005_create_answers_table.sql` - Creates the answers table

## Structure

Each migration file contains:

1. **Forward migration** - SQL statements to apply the migration
2. **Revert migration** - SQL statements to rollback the migration (commented out)

## Applying Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the forward migration SQL (uncommented section)
4. Run the migration

### Using Supabase CLI

```bash
# Apply a specific migration
supabase db push

# Or apply all migrations
supabase migration up
```

## Reverting Migrations

To revert a migration:

1. Uncomment the revert section in the migration file
2. Run the revert SQL statements in Supabase SQL Editor
3. Comment the revert section back

## Order of Execution

Migrations should be applied in numerical order:
1. `001_create_players_table.sql` (no dependencies)
2. `002_create_questions_table.sql` (depends on players)
3. `003_create_quiz_sessions_table.sql` (depends on players)
4. `004_create_quiz_participants_table.sql` (depends on quiz_sessions and players)
5. `005_create_answers_table.sql` (depends on quiz_sessions, questions, and players)

## Enabling Realtime

After applying migrations, enable Realtime subscriptions in Supabase:

1. Go to Database > Replication
2. Enable replication for:
   - `quiz_sessions` table
   - `quiz_participants` table
   - `answers` table

## Notes

- All tables use UUID primary keys with `uuid_generate_v4()` default
- Foreign key constraints ensure referential integrity
- Indexes are created for common query patterns
- Cascade deletes are configured where appropriate
