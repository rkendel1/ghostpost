# Limited Reveals Fix - Complete Summary

## Issue
"not tracking the fomor or displaying perply the metrics"

The limited reveals feature (FOMO reveal numbers) was completely broken:
- API returned "Unlimited reveals - no tracking" for posts with max_reveals=3
- No reveal_events records were being created in the database
- Userscript overlay did not display "reveal #X of Y" stats

## Root Cause

The `increment_reveal_count` PostgreSQL function executes with the caller's permissions by default (SECURITY INVOKER). When anonymous users called it:

```
Anonymous user → supabase.rpc('increment_reveal_count') → Function executes as anonymous
                                                         ↓
Function tries: SELECT * FROM limited_secrets WHERE post_id = ... FOR UPDATE
                                                         ↓
                        FOR UPDATE requires UPDATE permission
                                                         ↓
                        Anonymous user only has SELECT permission (via RLS)
                                                         ↓
                                Query returns NOT FOUND
                                                         ↓
                        Function returns { is_unlimited: true }
                                                         ↓
                        API returns "Unlimited reveals - no tracking"
```

## Solution

Added `SECURITY DEFINER` to the function:

```sql
CREATE OR REPLACE FUNCTION increment_reveal_count(...)
RETURNS JSON
SECURITY DEFINER -- Executes with function owner's permissions
SET search_path = public -- Prevents search_path attacks
AS $$ ... $$ LANGUAGE plpgsql;
```

Now the flow works correctly:
```
Anonymous user → supabase.rpc('increment_reveal_count') → Function executes as owner (postgres)
                                                         ↓
Function executes: SELECT * FROM limited_secrets WHERE post_id = ... FOR UPDATE
                                                         ↓
                        Owner has full permissions
                                                         ↓
                                Query succeeds
                                                         ↓
                        Increment counter, insert reveal_event
                                                         ↓
                Return { success: true, reveal_number: 1, total_reveals: 3, ... }
                                                         ↓
                        API returns proper reveal stats
                                                         ↓
                        Userscript displays "#1/3 — only 2 left!"
```

## Changes Made

### Code Changes
- **`supabase/migrations/20241211_fix_increment_reveal_security.sql`**
  - New migration that recreates `increment_reveal_count` with `SECURITY DEFINER`
  - Adds `SET search_path = public` for security

### Documentation
- **`LIMITED_REVEALS_FIX.md`** - Detailed technical explanation of bug and fix
- **`DEPLOYMENT.md`** - Step-by-step deployment and testing instructions
- **`supabase/README.md`** - General migration guide for all migrations

### What Didn't Change
- No changes to API endpoints (they were already correct)
- No changes to userscript (it already had display logic)
- No changes to RLS policies (they were already correct)
- Only the database function needed to be fixed

## Why This Fix is Safe

Using `SECURITY DEFINER` is safe here because:

1. **No SQL injection**: Uses parameterized inputs (`p_post_id`, `p_user_fingerprint`)
2. **Row-level locking**: Uses `FOR UPDATE` to prevent race conditions
3. **Business logic validation**: Checks `is_expired` and `max_reveals` before incrementing
4. **Limited scope**: Only touches `limited_secrets` and `reveal_events` tables
5. **Search path protection**: `SET search_path = public` prevents schema attacks
6. **Atomic operations**: All operations in single transaction
7. **Better than alternatives**: More secure than exposing service role keys

## Deployment Steps

1. **Apply migration** (choose one):
   - Via Supabase Dashboard: Copy SQL to SQL Editor and run
   - Via Supabase CLI: `supabase db push`
   - Via psql: `psql "..." < migration.sql`

2. **Verify**:
   ```sql
   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'increment_reveal_count';
   -- Should show prosecdef = true
   ```

3. **Test**:
   - Create a limited reveal post
   - Reveal it via userscript
   - Check for "#1/3" display in overlay
   - Verify `reveal_events` table has new records

See `DEPLOYMENT.md` for complete instructions.

## Impact

### Before Fix
- Limited reveals completely broken
- No tracking of who revealed when
- No FOMO effect in UI
- Users had no idea reveals were limited

### After Fix
- Full reveal tracking in `reveal_events` table
- Proper atomic increment with race condition protection
- Userscript displays "reveal #1 of 3 — only 2 left!"
- Color-coded urgency (blue → yellow → red as supply decreases)
- "SOLD OUT" messaging when limit reached

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Function has `prosecdef = true`
- [ ] Create limited reveal post (max_reveals=3)
- [ ] First reveal shows "#1/3 — only 2 left!" in blue
- [ ] Second reveal shows "#2/3 — only 1 left!" in yellow (if threshold reached)
- [ ] Third reveal shows "#3/3 — SOLD OUT!" in red
- [ ] Fourth reveal attempt shows "expired" error
- [ ] `reveal_events` table has 3 records with correct reveal_numbers
- [ ] Each reveal has user_fingerprint for analytics

## Related Files

### Migration Files
- `supabase/migrations/20231211_limited_reveals.sql` - Original tables and function
- `supabase/migrations/20241211_fix_increment_reveal_security.sql` - This fix

### API Endpoints
- `src/routes/api/limited-reveals/init/+server.ts` - Initialize limited secret
- `src/routes/api/limited-reveals/reveal/+server.ts` - Record a reveal (calls database function)
- `src/routes/api/limited-reveals/status/+server.ts` - Check reveal status
- `src/routes/api/analytics/track/+server.ts` - General analytics (separate from limited reveals)

### Frontend
- `static/ghostpost-reveal.user.js` - Userscript with reveal display logic (lines 825-862, 886-930)

### Documentation
- `LIMITED_REVEALS_FIX.md` - Technical deep dive
- `DEPLOYMENT.md` - Deployment guide
- `supabase/README.md` - Migration guide

## FAQ

**Q: Why not use a service role key instead?**
A: Service role keys have full access to everything. The SECURITY DEFINER function has limited scope and implements its own validation logic. It's more secure.

**Q: Why didn't you change the API endpoints?**
A: The API endpoints were already correct. They just call the database function. The bug was in the database function's permissions.

**Q: Why didn't you change the userscript?**
A: The userscript already had all the display logic for limited reveals. It just wasn't receiving the data due to the database bug.

**Q: Is this fix backward compatible?**
A: Yes. It doesn't change the function signature or return format. Existing code continues to work.

**Q: What if I don't apply the migration?**
A: Limited reveals will continue to be broken. The reveal API will return "Unlimited reveals" and no tracking will occur.

**Q: Can I test this locally?**
A: Yes, if you have a local Supabase instance. Apply the migration to your local database and test with the local API endpoints.

## Success Criteria

This fix is successful when:
1. ✅ Reveal API returns proper reveal numbers (not null)
2. ✅ `reveal_events` table populates with new records
3. ✅ Userscript displays "#X/Y" stats in overlay
4. ✅ Color coding works (blue → yellow → red)
5. ✅ "SOLD OUT" messaging appears when limit reached
6. ✅ No security vulnerabilities introduced

## Next Steps

1. Apply the migration to production database (see DEPLOYMENT.md)
2. Test with real limited reveal posts
3. Monitor for any issues
4. Close the issue once verified working

## Support

If you encounter issues:
1. Check DEPLOYMENT.md for common issues
2. Verify migration applied correctly (`prosecdef = true`)
3. Check Supabase logs for errors
4. Review the issue thread for similar problems
5. Open a new issue with error logs if problem persists
