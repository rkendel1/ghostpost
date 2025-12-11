# Supabase Migrations

This directory contains SQL migrations for the Ghostpost database.

## Applying Migrations

### Option 1: Via Supabase Dashboard (Recommended)
1. Log in to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Open the migration file you want to run
4. Copy the SQL contents
5. Paste into the SQL Editor and click "Run"

### Option 2: Via Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push
```

### Option 3: Manual Execution
Connect to your PostgreSQL database and run the migration files in order:
```bash
psql "postgresql://..." < supabase/migrations/20241211_create_posts.sql
psql "postgresql://..." < supabase/migrations/20231211_limited_reveals.sql
psql "postgresql://..." < supabase/migrations/20241211_fix_increment_reveal_security.sql
```

## Migration Files

- **20241211_create_posts.sql** - Creates the posts table for storing GhostPosts
- **20231211_limited_reveals.sql** - Creates limited_secrets and reveal_events tables, RLS policies, and the increment_reveal_count function (Note: filename has 2023 date but this is the actual filename)
- **20241211_fix_increment_reveal_security.sql** - **CRITICAL FIX** - Updates increment_reveal_count to use SECURITY DEFINER so anonymous users can record reveals

## Required Migration

**If you have limited reveals not working (reveal API returning "Unlimited reveals"):**
You MUST run the `20241211_fix_increment_reveal_security.sql` migration. This fixes a critical bug where the `increment_reveal_count` function couldn't access limited_secrets records when called by anonymous users.

## Verifying the Fix

After applying the migration, you can verify it worked by:

1. Check the function has SECURITY DEFINER:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'increment_reveal_count';
```
The `prosecdef` column should be `true`.

2. Test the reveal endpoint with a post that has limited reveals set up.
