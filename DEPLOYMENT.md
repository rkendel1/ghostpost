# Deployment Instructions for Limited Reveals Fix

## Prerequisites
- Access to Supabase project dashboard OR Supabase CLI OR direct PostgreSQL access
- The repository changes from this PR

## Steps to Deploy

### 1. Apply the Database Migration

Choose ONE of the following methods:

#### Method A: Supabase Dashboard (Easiest)
1. Log in to your Supabase project at https://supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Open the file `supabase/migrations/20241211_fix_increment_reveal_security.sql` from this repository
4. Copy the entire SQL content
5. Paste it into a new query in the SQL Editor
6. Click **Run** button
7. Verify success message appears

#### Method B: Supabase CLI
```bash
# If you have Supabase CLI installed and configured
cd /path/to/ghostpost
supabase db push
```

#### Method C: Direct PostgreSQL Connection
```bash
# Replace with your actual connection string
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" \
  < supabase/migrations/20241211_fix_increment_reveal_security.sql
```

### 2. Verify the Migration

Run this SQL query in Supabase SQL Editor:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'increment_reveal_count';
```

**Expected result:**
- `proname`: `increment_reveal_count`
- `prosecdef`: `true` (or `t`)

If `prosecdef` is `false`, the migration didn't apply correctly.

### 3. Test the Fix

#### Option 1: Via Userscript (End-to-End Test)
1. Create a new GhostPost with limited reveals (e.g., max_reveals=3) via the app UI
2. Post the content somewhere (Twitter, etc.)
3. Open that page with the Ghostpost Reveal userscript installed
4. Click the 👻 button to reveal the secret
5. **Expected result**: You should see:
   - "👻 Limited Reveal" header
   - "#1/3" reveal number display
   - "You are reveal #1 of 3 — only 2 left!" message

#### Option 2: Via API (Direct Test)
```bash
# Replace YOUR_POST_ID with actual post_id
curl -X POST https://ghostpost-six.vercel.app/api/limited-reveals/reveal \
  -H "Content-Type: application/json" \
  -d '{"post_id":"YOUR_POST_ID","user_fingerprint":"test123"}'
```

**Expected response:**
```json
{
  "success": true,
  "reveal_number": 1,
  "total_reveals": 3,
  "remaining": 2,
  "message": "You are reveal #1 of 3 — only 2 left!"
}
```

**Wrong response (before fix):**
```json
{
  "success": true,
  "reveal_number": null,
  "total_reveals": null,
  "remaining": null,
  "message": "Unlimited reveals - no tracking"
}
```

### 4. Verify Database Records

Check that reveal events are being tracked:
```sql
SELECT * FROM reveal_events 
ORDER BY created_at DESC 
LIMIT 10;
```

You should see new rows appear each time someone reveals a secret.

### 5. Monitor for Issues

After deployment, monitor:
- Supabase logs for any database errors
- Application logs for any API errors at `/api/limited-reveals/reveal`
- User reports about reveal tracking

## Rollback Plan

If issues arise, you can rollback by removing `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION increment_reveal_count(
    p_post_id TEXT,
    p_user_fingerprint TEXT DEFAULT NULL
)
RETURNS JSON AS $$
-- ... (same function body without SECURITY DEFINER and SET search_path)
$$ LANGUAGE plpgsql;
```

However, this will revert to the broken behavior where reveals aren't tracked properly.

## Common Issues

### "Function not found" error
- The migration didn't run successfully
- Re-run the migration SQL

### Still getting "Unlimited reveals" response
- Check that `prosecdef = true` for the function
- Clear any API response caches
- Try with a new post_id that has limited reveals set up

### Reveal events not appearing in database
- Check RLS policies allow INSERT on reveal_events
- Verify the post has a limited_secrets record with matching post_id
- Check application logs for errors

## Security Notes

This fix uses `SECURITY DEFINER` which is safe because:
- The function has limited scope (only touches 2 tables)
- Uses parameterized inputs (no SQL injection)
- Sets `search_path = public` to prevent schema attacks
- Implements its own business logic validation
- Better than exposing a service role key in environment variables

## Need Help?

See the full technical details in:
- `LIMITED_REVEALS_FIX.md` - Comprehensive explanation of the bug and fix
- `supabase/README.md` - General migration instructions
- Issue: "not tracking the fomor or displaying perply the metrics"
