# Limited Reveals Fix - December 11, 2024

## Issue Summary

Limited reveals feature was not tracking reveals properly:

1. Reveal API returned "Unlimited reveals - no tracking" despite status showing max_reveals=3
2. No records were being inserted into the `reveal_events` table
3. Userscript overlay did not display "fomo number" (reveal #X of Y)

## Root Cause

The `increment_reveal_count` database function was executing with anonymous user permissions (SECURITY INVOKER is the default). When an anonymous user called the function via `supabase.rpc()`:

1. Function tried to execute: `SELECT * FROM limited_secrets WHERE post_id = p_post_id FOR UPDATE`
2. The `FOR UPDATE` clause requires UPDATE permission on the table
3. Anonymous users only have SELECT permission via RLS policy
4. Query returned NOT FOUND (even though the record exists)
5. Function returned `is_unlimited: true`
6. API endpoint returned "Unlimited reveals - no tracking"
7. No reveal_events were created

## Fix Applied

**Migration: `supabase/migrations/20241211_fix_increment_reveal_security.sql`**

Added `SECURITY DEFINER` to the `increment_reveal_count` function:

```sql
CREATE OR REPLACE FUNCTION increment_reveal_count(...)
RETURNS JSON
SECURITY DEFINER -- Function runs with owner's permissions, bypassing RLS
SET search_path = public -- Prevent search_path attacks
AS $$
...
```

This allows the function to:

- Access `limited_secrets` records regardless of caller's permissions
- Lock rows with `FOR UPDATE` for atomic operations
- Insert into `reveal_events` table
- Return proper reveal numbers and remaining count

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20241211_fix_increment_reveal_security.sql`
4. Paste and run in SQL Editor

### Option 2: Supabase CLI

```bash
supabase db push
```

### Option 3: Direct SQL

```bash
psql "postgresql://..." < supabase/migrations/20241211_fix_increment_reveal_security.sql
```

## Verification Steps

1. **Verify function has SECURITY DEFINER:**

```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'increment_reveal_count';
```

Should return `prosecdef = true`

2. **Test the reveal endpoint:**

```bash
# First, create a limited reveal post via the app UI

# Then call the reveal endpoint:
curl -X POST https://your-app.vercel.app/api/limited-reveals/reveal \
  -H "Content-Type: application/json" \
  -d '{"post_id":"YOUR_POST_ID","user_fingerprint":"test123"}'

# Should return:
# {
#   "success": true,
#   "reveal_number": 1,
#   "total_reveals": 3,
#   "remaining": 2,
#   "message": "You are reveal #1 of 3 — only 2 left!"
# }
```

3. **Check reveal_events table:**

```sql
SELECT * FROM reveal_events ORDER BY created_at DESC LIMIT 10;
```

Should show new reveal events being created.

4. **Test in userscript:**

- Open a page with a limited reveal GhostPost
- Click the ghost button to reveal
- Should see "Limited Reveal" stats displayed with reveal number and remaining count

## Technical Details

### Why SECURITY DEFINER is Safe Here

The `increment_reveal_count` function is safe to run as SECURITY DEFINER because:

1. **No SQL injection risk**: Uses parameterized inputs (`p_post_id`, `p_user_fingerprint`)
2. **Row-level locking**: Uses `FOR UPDATE` to prevent race conditions
3. **Business logic validation**: Checks `is_expired` and `max_reveals` before incrementing
4. **Limited scope**: Only accesses `limited_secrets` and `reveal_events` tables
5. **Search path protection**: Sets `search_path = public` to prevent schema attacks
6. **Atomic operations**: All operations are within a single transaction

### Why Not Use Service Role Key Instead?

We considered using a service role key in the API endpoint instead, but chose the SECURITY DEFINER approach because:

1. **Simplicity**: No need to manage/rotate service keys in environment variables
2. **Security**: Service keys have full access; function has limited scope
3. **Maintainability**: Logic is encapsulated in one place (the database)
4. **Performance**: Atomic database operations vs multiple API calls
5. **Race conditions**: Database-level locking prevents issues with concurrent reveals

## Related Files

- **Database function**: `supabase/migrations/20231211_limited_reveals.sql` (original)
- **Fix migration**: `supabase/migrations/20241211_fix_increment_reveal_security.sql` (this fix)
- **API endpoint**: `src/routes/api/limited-reveals/reveal/+server.ts`
- **Userscript**: `static/ghostpost-reveal.user.js`
- **Status endpoint**: `src/routes/api/limited-reveals/status/+server.ts`

## Notes on Analytics vs Limited Reveals

The issue report mentioned seeing calls to `/api/analytics/track` but no reveal_events. This is expected:

- **`/api/analytics/track`**: General decode analytics stored in Redis (all posts)
- **`/api/limited-reveals/reveal`**: Limited reveal tracking in PostgreSQL (only limited posts)

These are two separate systems:

- Analytics tracks ALL decodes for metrics/dashboards
- Limited reveals tracks ONLY posts with reveal limits for the "fomo" feature

The userscript correctly calls BOTH endpoints:

1. First calls `/api/limited-reveals/reveal` (if post has a post_id)
2. Separately tracks general analytics (not shown in the issue report)
