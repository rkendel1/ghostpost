# Setting Up Tracking

This guide explains how to set up and use the new tracking features in GhostPost.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with the database migrations applied
2. **Environment Variables**: Your `.env` file must have valid Supabase credentials

## Step 1: Apply Database Migration

Run the migration in your Supabase SQL Editor:

```bash
# Navigate to your Supabase dashboard
# Go to SQL Editor
# Copy and paste the contents of:
supabase/migrations/20241213_tracking_installs_and_messages.sql
# Click "Run" to execute
```

Or if using Supabase CLI:

```bash
supabase db push
```

## Step 2: Verify Tables

After running the migration, verify that the following tables exist:

1. `userscript_installs`
2. `encoded_messages_tracking`

You should see them in the Supabase dashboard under "Table Editor".

## Step 3: Deploy Userscript

The updated userscript (v2.5.0) includes tracking code. It will automatically:

1. Generate a unique fingerprint on first load
2. Send install data to your API
3. Send heartbeats every 24 hours

Users will need to update to v2.5.0 to be tracked. The userscript will auto-update if users have auto-update enabled in their userscript manager.

## Step 4: Test Tracking

### Test Userscript Install Tracking:

1. Install the userscript in a browser
2. Open the browser console (F12)
3. Look for the tracking request in the Network tab
4. Check localStorage for these keys:
   - `ghostpost_install_fingerprint`
   - `ghostpost_last_tracked`

### Test Encoded Message Tracking:

1. Log in to your GhostPost account
2. Go to `/compose` page
3. Create and encode a message
4. Check the `encoded_messages_tracking` table in Supabase
5. You should see a new row with your message metadata

## Viewing Analytics

### Query Userscript Installs:

```sql
-- Total installs
SELECT COUNT(*) as total_installs FROM userscript_installs;

-- Active installs (last 7 days)
SELECT COUNT(*) as active_installs 
FROM userscript_installs 
WHERE last_seen > NOW() - INTERVAL '7 days';

-- Platform breakdown
SELECT platform, COUNT(*) as count 
FROM userscript_installs 
GROUP BY platform 
ORDER BY count DESC;

-- Browser breakdown
SELECT browser, COUNT(*) as count 
FROM userscript_installs 
GROUP BY browser 
ORDER BY count DESC;

-- OS breakdown
SELECT os, COUNT(*) as count 
FROM userscript_installs 
GROUP BY os 
ORDER BY count DESC;
```

### Query Encoded Messages:

```sql
-- Total messages created
SELECT COUNT(*) as total_messages FROM encoded_messages_tracking;

-- Messages by platform
SELECT platform, COUNT(*) as count 
FROM encoded_messages_tracking 
GROUP BY platform 
ORDER BY count DESC;

-- Messages by secret type
SELECT secret_type, COUNT(*) as count 
FROM encoded_messages_tracking 
GROUP BY secret_type;

-- Average message lengths
SELECT 
  AVG(visible_length) as avg_visible,
  AVG(hidden_length) as avg_hidden,
  AVG(total_length) as avg_total
FROM encoded_messages_tracking;

-- Top users by message count
SELECT user_id, COUNT(*) as message_count 
FROM encoded_messages_tracking 
GROUP BY user_id 
ORDER BY message_count DESC 
LIMIT 10;

-- Limited reveals adoption
SELECT 
  COUNT(CASE WHEN has_limited_reveals THEN 1 END) as with_limits,
  COUNT(CASE WHEN NOT has_limited_reveals THEN 1 END) as without_limits
FROM encoded_messages_tracking;
```

## Privacy Considerations

### What is tracked:
- Browser fingerprint (not personally identifiable)
- Device characteristics (platform, browser, OS)
- Message metadata (no content)
- Character counts
- Timestamps

### What is NOT tracked:
- User IP addresses
- Personal information
- Actual message content (visible or secret)
- User behavior outside of GhostPost
- Browsing history

### User Control:
- Users can clear localStorage to reset their fingerprint
- Tracking failures don't affect functionality
- Anonymous installs are supported
- Users can opt-out by disabling the userscript

## Troubleshooting

### Tracking not working?

1. **Check API endpoint**: Verify `/api/tracking/install` is accessible
2. **Check Supabase**: Ensure tables exist and RLS policies are correct
3. **Check browser console**: Look for error messages
4. **Check Network tab**: See if tracking requests are being made
5. **Verify environment variables**: Ensure Supabase credentials are correct

### Common issues:

**"Failed to track install"**
- Check Supabase credentials in `.env`
- Verify tables exist in database
- Check RLS policies allow anonymous inserts

**"Install fingerprint not found"**
- Check if localStorage is enabled in browser
- Verify the fingerprint generation code is working

**"Heartbeat not updating"**
- Check if `last_tracked` timestamp in localStorage is recent
- Verify heartbeat interval (24 hours)
- Check if API endpoint is accessible

## Advanced: Custom Analytics Dashboard

You can create a custom analytics dashboard by:

1. Creating API endpoints to fetch aggregate data
2. Building UI components to display stats
3. Adding charts/graphs using a library like Chart.js
4. Implementing real-time updates with Supabase Realtime

Example API endpoint structure:

```typescript
// /api/analytics/installs/+server.ts
export async function GET() {
  const { data: stats } = await supabase
    .from('userscript_installs')
    .select('platform, browser, os, last_seen');
  
  // Process and return aggregate stats
  return json({ stats });
}
```

## Next Steps

1. Monitor tracking data in Supabase
2. Create visualization dashboards
3. Use data to improve user experience
4. Share aggregate statistics with users
5. Add more granular tracking as needed

For detailed implementation information, see `TRACKING_IMPLEMENTATION.md`.
