# Tracking Implementation Summary

## Overview

This document explains the new tracking features implemented for GhostPost to monitor userscript installations and encoded message creation while maintaining a privacy-first approach.

## Features Implemented

### 1. Userscript Install Tracking

**What is tracked:**

- Unique install fingerprint (generated from browser characteristics)
- Device information: platform (Desktop/Mobile/Tablet), browser, OS
- User agent string
- Installation timestamp
- Last seen timestamp (updated via daily heartbeats)
- Userscript version

**Privacy considerations:**

- No personally identifiable information (PII) is collected
- Fingerprints are browser-specific, not user-specific
- Users can clear localStorage to reset tracking
- Tracking failures are silent and don't affect functionality

**How it works:**

1. On first load, the userscript generates a unique fingerprint based on:
   - User agent
   - Language
   - Screen dimensions and color depth
   - Timezone offset
2. Device info is detected from the user agent
3. Data is sent to `/api/tracking/install` endpoint
4. Fingerprint is stored in localStorage for future requests
5. Heartbeats are sent once every 24 hours to update `last_seen`

### 2. Encoded Message Tracking

**What is tracked:**

- User ID (required - only for authenticated users)
- Post ID (the unique identifier for the encoded message)
- Platform (twitter, linkedin, facebook, tiktok)
- Secret type (text or image)
- Character statistics:
  - Visible message length
  - Hidden content length
  - Total encoded message length
- Limited reveals settings (if enabled)
- Creation timestamp

**Privacy considerations:**

- **No actual message content is stored** - only metadata
- Only tracks messages from authenticated users
- Data is tied to user accounts for dashboard analytics

**How it works:**

1. When a user encodes a message in the compose page
2. After successful encoding, metadata is saved to `encoded_messages_tracking` table
3. This happens after saving to the `posts` table
4. Tracking failures are logged but don't show errors to users

## Database Schema

### `userscript_installs` Table

```sql
- id (UUID, primary key)
- user_id (UUID, nullable, references auth.users)
- install_fingerprint (TEXT, unique, not null)
- user_agent (TEXT)
- platform (TEXT) -- Desktop/Mobile/Tablet
- browser (TEXT) -- Chrome/Firefox/Safari/Edge/Opera
- os (TEXT) -- Windows/macOS/Linux/Android/iOS
- installed_at (TIMESTAMP)
- last_seen (TIMESTAMP)
- version (TEXT) -- Userscript version
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### `encoded_messages_tracking` Table

```sql
- id (UUID, primary key)
- user_id (UUID, not null, references auth.users)
- post_id (TEXT, not null)
- platform (TEXT, not null)
- secret_type (TEXT, not null) -- 'text' or 'image'
- visible_length (INTEGER, not null)
- hidden_length (INTEGER, not null)
- total_length (INTEGER, not null)
- has_limited_reveals (BOOLEAN)
- max_reveals (INTEGER, nullable)
- created_at (TIMESTAMP)
```

## API Endpoints

### POST `/api/tracking/install`

Tracks new userscript installations or updates existing ones.

**Request body:**

```json
{
	"install_fingerprint": "gp_abc123_xyz",
	"device_info": {
		"userAgent": "Mozilla/5.0...",
		"platform": "Desktop",
		"browser": "Chrome",
		"os": "Windows",
		"version": "2.5.0"
	},
	"user_id": "optional-uuid"
}
```

**Response:**

```json
{
	"success": true,
	"message": "Install tracked successfully",
	"is_new": true
}
```

### POST `/api/tracking/heartbeat`

Updates the `last_seen` timestamp for an existing install.

**Request body:**

```json
{
	"install_fingerprint": "gp_abc123_xyz",
	"version": "2.5.0"
}
```

**Response:**

```json
{
	"success": true,
	"message": "Heartbeat updated successfully"
}
```

## Userscript Changes (v2.5.0)

### New Functions:

- `generateInstallFingerprint()`: Creates unique fingerprint from browser characteristics
- `detectDeviceInfo()`: Extracts platform, browser, and OS from user agent
- `trackInstall()`: Main tracking function that handles install/heartbeat logic

### Constants:

- `TRACKING_API_BASE`: Base URL for tracking API
- `HEARTBEAT_INTERVAL`: 24 hours in milliseconds

### Behavior:

- Tracking is called in `init()` function
- Uses localStorage to store fingerprint and last tracked timestamp
- Heartbeats only sent once per 24 hours to minimize API calls
- All errors are caught and logged silently

## Row Level Security (RLS)

Both tables have RLS enabled with appropriate policies:

### `userscript_installs`:

- Anyone can insert installs (for anonymous tracking)
- Anyone can update their own install by fingerprint
- Users can view their own installs

### `encoded_messages_tracking`:

- Users can view their own encoded message stats
- Users can insert their own encoded message tracking
- Only authenticated users can access this table

## Analytics Use Cases

This tracking enables:

1. **Install analytics**: Track number of active userscript installations
2. **Platform distribution**: See which browsers/OS users prefer
3. **Active users**: Track daily active users via heartbeats
4. **Message creation stats**: See how many messages users create
5. **Platform usage**: Understand which social platforms are most popular
6. **Feature adoption**: Track usage of limited reveals feature

## Testing

To test the tracking:

1. Install the userscript in a browser
2. Open browser console and look for tracking logs (if DEBUG_MODE is enabled)
3. Check localStorage for `ghostpost_install_fingerprint` and `ghostpost_last_tracked`
4. Create an encoded message while logged in
5. Check Supabase tables to verify data was inserted

## Future Enhancements

Potential improvements:

- Add geographic tracking (country-level, no IP storage)
- Track decode success rates
- Add retention metrics
- Create admin dashboard for viewing aggregate stats
- Track userscript auto-update adoption rates
