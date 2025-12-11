# Limited Edition Secrets - Implementation Guide

## Overview

The Limited Reveals feature transforms Ghostpost from a simple message hiding tool into a digital scarcity platform. Creators can set a maximum number of reveals for their secrets, creating extreme FOMO (Fear Of Missing Out) as the reveal limit approaches.

## Key Features

### 1. **Creator Controls**
- Set max reveals when creating a post (e.g., "only 100 people can ever see this")
- Default is unlimited reveals (backward compatible)
- Immediate feedback on what happens when limit is reached

### 2. **Real-Time FOMO UI**
- Live counter: "You are reveal #87 of 100 — only 13 left!"
- Progress bars that change color based on availability:
  - Green: >20% remaining
  - Yellow: 5-20% remaining
  - Red: <5% remaining (with pulsing animation)
- Confetti celebration for last 10 reveals
- "SOLD OUT FOREVER" message when limit reached

### 3. **Live Analytics Dashboard**
- Real-time countdown ring showing X/Y reveals
- Reveal timeline with timestamps
- Percentage revealed with visual progress bar
- "SOLD OUT FOREVER" banner when complete

### 4. **Social Amplification**
- Auto-generated share text: "I just got reveal #87 of 100 — only 13 left forever! 👻"
- One-click copy to share achievement
- Builds viral FOMO loop

### 5. **Real-Time Updates**
- Uses Supabase Realtime subscriptions
- All viewers see live countdown simultaneously
- Dashboard updates in real-time as reveals happen

## Database Schema

### Tables

#### `limited_secrets`
```sql
- id (UUID, primary key)
- post_id (TEXT, unique) - Links to posts.post_id
- user_id (UUID) - Creator's user ID
- max_reveals (INTEGER, nullable) - NULL = unlimited
- current_reveals (INTEGER, default 0)
- is_expired (BOOLEAN, default false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `reveal_events`
```sql
- id (UUID, primary key)
- post_id (TEXT) - Links to limited_secrets.post_id
- reveal_number (INTEGER) - Sequential reveal number
- timestamp (TIMESTAMP)
- user_fingerprint (TEXT, nullable) - Anonymous user tracking
- created_at (TIMESTAMP)
```

### Database Function

#### `increment_reveal_count(p_post_id, p_user_fingerprint)`
- **Purpose**: Atomically increments reveal counter with race condition protection
- **Returns**: JSON with success status, reveal number, and remaining count
- **Features**:
  - Uses `FOR UPDATE` lock to prevent concurrent modifications
  - Checks expiry status before incrementing
  - Auto-marks as expired when limit reached
  - Inserts reveal event in same transaction

## API Endpoints

### POST `/api/limited-reveals/init`
Initialize a limited secret when creating a post.

**Request:**
```json
{
  "post_id": "uuid-here",
  "max_reveals": 100,
  "user_id": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "limited_secret": { ... }
}
```

### GET `/api/limited-reveals/status?post_id={id}`
Check current status of a limited secret.

**Response:**
```json
{
  "success": true,
  "status": {
    "post_id": "...",
    "max_reveals": 100,
    "current_reveals": 87,
    "is_expired": false,
    "remaining_reveals": 13,
    "percentage_revealed": 87.0,
    "can_reveal": true
  }
}
```

### POST `/api/limited-reveals/reveal`
Record a reveal (called when decoding).

**Request:**
```json
{
  "post_id": "uuid-here",
  "user_fingerprint": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "reveal_number": 87,
  "total_reveals": 100,
  "remaining": 13,
  "message": "You are reveal #87 of 100 — only 13 left!"
}
```

### GET `/api/limited-reveals/analytics?post_id={id}`
Get detailed analytics for a limited secret.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "post_id": "...",
    "max_reveals": 100,
    "current_reveals": 87,
    "remaining_reveals": 13,
    "percentage_revealed": 87.0,
    "is_expired": false,
    "reveal_timeline": [
      { "reveal_number": 1, "timestamp": "..." },
      { "reveal_number": 2, "timestamp": "..." }
    ]
  }
}
```

## Security Features

### 1. **Atomic Operations**
- Database function with `FOR UPDATE` lock prevents race conditions
- Multiple simultaneous reveals can't exceed the limit
- All increment operations are transactional

### 2. **Enhanced Fingerprinting**
Browser fingerprinting includes:
- User agent
- Screen dimensions and color depth
- Language and timezone
- Hardware concurrency
- Device memory
- Canvas fingerprinting
- WebGL renderer info

### 3. **Row Level Security**
- Users can only create limited secrets for their own posts
- Public read access is documented (needed for decode page)
- Reveal events are tied to their parent posts

## Frontend Integration

### Compose Page

Add the limited reveals toggle and input:

```svelte
<input type="checkbox" bind:checked={enableLimitedReveals} />
{#if enableLimitedReveals}
  <input type="number" bind:value={maxReveals} min="1" max="10000" />
{/if}
```

Initialize when encoding:
```javascript
if (enableLimitedReveals && maxReveals > 0) {
  await fetch('/api/limited-reveals/init', {
    method: 'POST',
    body: JSON.stringify({ post_id, max_reveals: maxReveals, user_id })
  });
}
```

### Decode Page

Check status before revealing:
```javascript
const statusResponse = await fetch(`/api/limited-reveals/status?post_id=${postId}`);
const { status } = await statusResponse.json();

if (status.is_expired || !status.can_reveal) {
  // Show "SOLD OUT" message
  return;
}

// Record the reveal
const revealResponse = await fetch('/api/limited-reveals/reveal', {
  method: 'POST',
  body: JSON.stringify({ post_id: postId, user_fingerprint: generateFingerprint() })
});
```

Setup real-time updates:
```javascript
import { subscribeLimitedSecret } from '$lib/realtime-limited-reveals';

const unsubscribe = subscribeLimitedSecret(postId, (updatedSecret) => {
  // Update UI with new reveal count
  revealStatus = { ...revealStatus, current_reveals: updatedSecret.current_reveals };
});
```

### Dashboard

Load analytics and setup real-time:
```javascript
const response = await fetch(`/api/limited-reveals/analytics?post_id=${postId}`);
const { analytics } = await response.json();

// Setup real-time updates
setupRealtimeUpdates(postId);
```

## Installation

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:
```bash
supabase/migrations/20231211_limited_reveals.sql
```

This creates:
- `limited_secrets` table
- `reveal_events` table
- Indexes for performance
- RLS policies
- Atomic increment function

### 2. Install Dependencies

The feature requires canvas-confetti:
```bash
npm install canvas-confetti
```

### 3. Deploy

Build and deploy as normal:
```bash
npm run build
```

## Usage Examples

### Example 1: Limited Secret Message

```javascript
// On compose page
enableLimitedReveals = true;
maxReveals = 50;
// Creates a secret that only 50 people can ever see
```

### Example 2: Viral Campaign

```
1. Creator makes a secret with max 100 reveals
2. Posts on Twitter: "I hid something special - only 100 people will ever see it"
3. First viewer reveals: "I got reveal #1 of 100!" (shares)
4. FOMO builds as counter approaches 100
5. At reveal #95: Red pulsing warning + confetti
6. At reveal #100: "SOLD OUT FOREVER" - secret is locked permanently
```

### Example 3: Real-Time Watch Party

```
Creator announces: "New limited secret drops in 5 minutes - only 50 reveals!"
Everyone watches the dashboard together
Real-time counter updates as people reveal
Chat explodes when someone gets #50 (last one)
```

## Customization

### Adjust FOMO Thresholds

In `src/routes/decode/+page.svelte`:
```javascript
// Show confetti for last 10 reveals
if (revealResult.remaining !== null && revealResult.remaining <= 10) {
  triggerConfetti();
}

// Pulsing warning at 20% remaining
{#if revealResult.remaining <= 20}
  <div class="animate-pulse">Warning!</div>
{/if}
```

### Custom Progress Bar Colors

```svelte
<div 
  class:bg-success-500={percentage < 50}
  class:bg-warning-500={percentage >= 50 && percentage < 80}
  class:bg-error-500={percentage >= 80}
>
```

### Different Fingerprinting

Modify `generateFingerprint()` in decode page to add/remove entropy sources.

## Performance Considerations

- Database function uses row-level locking (may queue under extreme concurrency)
- Realtime subscriptions are lightweight but scale per-post
- Analytics queries scan reveal_events (add pagination for >1000 events)
- Canvas/WebGL fingerprinting adds ~10ms to decode time

## Future Enhancements

Potential additions:
1. **Waitlist**: Allow users to join a waitlist when sold out
2. **Secondary Market**: Let users transfer their reveal slot
3. **Timed Expiry**: Auto-expire after X hours regardless of reveals
4. **Reveal Tiers**: Different content for reveal #1 vs #100
5. **NFT Integration**: Mint an NFT for each reveal
6. **Leaderboards**: Show who got first/last/lucky numbers

## Troubleshooting

### Issue: Reveals exceeding limit
- Check that database function is being called (not direct UPDATE)
- Verify `FOR UPDATE` lock is working
- Check for connection pooling issues

### Issue: Real-time not updating
- Verify Supabase Realtime is enabled for tables
- Check browser console for subscription errors
- Ensure RLS policies allow reading updated rows

### Issue: Fingerprinting too weak
- Add more entropy sources (WebRTC, audio context, etc.)
- Consider server-side session tracking
- Use localStorage to persist across page loads

## Support

For issues or questions:
- Check existing analytics: `GET /api/limited-reveals/analytics?post_id={id}`
- View database logs for function calls
- Test with unlimited posts first (max_reveals = null)
