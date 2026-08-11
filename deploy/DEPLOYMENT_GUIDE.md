# Ghostpost Deployment Guide

## Overview

This guide covers deploying the complete Ghostpost system including:
- Database migrations (Supabase)
- API endpoints (Vercel/production server)
- Browser extension (Chrome Web Store)
- Userscript (GreasyFork/Tampermonkey)

## Prerequisites

- Supabase project (with URL and anon key)
- Vercel account or production deployment server
- Node.js 18+ installed locally
- npm or yarn package manager
- Chrome extension developer mode enabled (for testing)

## Part 1: Database Migration Deployment

### Step 1a: Via Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Create new query
4. Copy entire contents of `supabase/migrations/20260811_create_secure_notes.sql`
5. Paste into SQL editor
6. Click "Run"
7. Verify success (should see all tables, indexes, triggers created)

### Step 1b: Via Supabase CLI

```bash
# Install/update Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push

# Verify migration
supabase db pull
```

### Step 1c: Using Migration Script

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"

# Run migration script
node deploy/run-migration.js
```

### Verification Checklist

After migration runs, verify in Supabase:

- [ ] `secure_notes` table exists with all columns
- [ ] `note_reveal_records` table exists
- [ ] All 6 indexes created (check under Indexes)
- [ ] All 6 RLS policies enabled (check Policies)
- [ ] Triggers created:
  - `tr_update_unique_revealers`
  - `tr_update_secure_notes_timestamp`
- [ ] View `secure_notes_analytics` created
- [ ] Functions created:
  - `cleanup_expired_secure_notes()`
  - `update_unique_revealers()`
  - `update_secure_notes_timestamp()`

**Query to verify:**
```sql
-- Should return table info
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('secure_notes', 'note_reveal_records');

-- Should return 6 indexes
SELECT * FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('secure_notes', 'note_reveal_records');

-- Should return 6 policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('secure_notes', 'note_reveal_records');
```

## Part 2: API Endpoint Deployment

### For Vercel (Recommended)

```bash
# 1. Ensure .env.local has Supabase credentials
cat > .env.local << EOF
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PRIVATE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
EOF

# 2. Build locally to verify
npm run build

# 3. Deploy to Vercel
vercel deploy --prod

# 4. Verify endpoints work
curl https://your-domain.vercel.app/api/secure-notes/status

# Should return: {"success":false,"error":"Missing note_id"}
# This means endpoint is working
```

### For Custom Server (Node/Express)

```bash
# 1. Build the application
npm run build

# 2. Create systemd service (on Linux)
sudo tee /etc/systemd/system/ghostpost.service << EOF
[Unit]
Description=Ghostpost API Server
After=network.target

[Service]
Type=simple
User=ghostpost
WorkingDirectory=/opt/ghostpost
Environment="NODE_ENV=production"
Environment="PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
Environment="PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"
ExecStart=/usr/bin/node build/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 3. Enable and start service
sudo systemctl enable ghostpost
sudo systemctl start ghostpost

# 4. Setup reverse proxy (nginx)
sudo tee /etc/nginx/sites-available/ghostpost << EOF
server {
    listen 443 ssl http2;
    server_name api.ghostpost.app;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo systemctl restart nginx
```

### API Endpoints Deployed

All endpoints use:
- **Method:** POST (except `/status` which is GET)
- **Content-Type:** application/json
- **CORS:** Enabled for all origins

**Endpoints:**

```
POST https://your-domain/api/secure-notes/create
  Body: {
    encrypted_content: string,
    content_nonce: string,
    config: {
      expiryType: 'time-based'|'single-reveal'|'never',
      expiryMinutes?: number,
      requirePassword: boolean,
      singleRevealOnly: boolean,
      allowSharing: boolean
    },
    post_id?: string,
    owner_id?: string
  }
  Returns: { success: boolean, noteId?: string, error?: string }

POST https://your-domain/api/secure-notes/reveal
  Body: {
    note_id: string,
    fingerprint: string,
    password?: string
  }
  Returns: {
    success: boolean,
    encrypted_content?: string,
    content_nonce?: string,
    requiresPassword?: boolean,
    revealNumber?: number,
    config?: object
  }

GET https://your-domain/api/secure-notes/status?note_id=UUID
  Returns: {
    success: boolean,
    isExpired?: boolean,
    canReveal?: boolean,
    status?: object
  }

POST https://your-domain/api/secure-notes/revoke
  Body: { note_id: string, owner_id?: string }
  Returns: { success: boolean, error?: string }
```

### Testing Endpoints

```bash
# Test create endpoint
curl -X POST https://your-domain/api/secure-notes/create \
  -H "Content-Type: application/json" \
  -d '{
    "encrypted_content": "base64-encoded-encrypted-data",
    "content_nonce": "base64-encoded-nonce",
    "config": {
      "expiryType": "time-based",
      "expiryMinutes": 1440,
      "requirePassword": false,
      "singleRevealOnly": false,
      "allowSharing": true
    }
  }'

# Test status endpoint
curl "https://your-domain/api/secure-notes/status?note_id=SOME-UUID"

# Test with invalid ID (should return 404)
curl "https://your-domain/api/secure-notes/status?note_id=invalid"
```

## Part 3: Browser Extension Deployment

### Option A: Chrome Web Store (Production)

1. **Create Chrome Developer Account**
   - Visit https://developer.chrome.com/docs/webstore/
   - Register as developer ($5 USD one-time)

2. **Prepare Extension Package**
   - Extract `ghostpost-extension.zip`
   - Verify `manifest.json` is valid
   - Test locally first (see below)

3. **Upload to Chrome Web Store**
   - Visit https://chrome.google.com/webstore/developer/dashboard
   - Click "New Item"
   - Upload `ghostpost-extension.zip`
   - Fill in:
     - Name: "Ghostpost - Hidden Message Detector"
     - Description: "Automatically detect and reveal hidden messages"
     - Category: Productivity
     - Language: English
     - Detailed description with screenshots
     - Icons (provided in package)
     - Screenshots/promotional images
     - Privacy policy: Point to your privacy policy
     - Support email: support@ghostpost.app

4. **Submit for Review**
   - Review store listing
   - Accept policies
   - Submit for review
   - Wait 1-3 business days for approval

### Option B: Manual Installation (For Testing)

1. **Enable Developer Mode**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)

2. **Load Extension**
   - Click "Load unpacked"
   - Navigate to extracted `browser-extension` folder
   - Select it and click Open
   - Extension will load and show in extensions list

3. **Test on Social Media**
   - Visit X.com, Reddit, or Facebook
   - Browser extension icon should appear
   - Click to open sidebar
   - Navigate to page with encoded messages
   - Test detection and reveal

### Option C: Firefox Add-ons (Alternative)

1. **Convert Manifest V2/V3 to WebExtensions API compatibility**
2. **Visit https://addons.mozilla.org/en-US/firefox/developers/**
3. **Upload signed extension**
4. **Follow review process**

## Part 4: Userscript Deployment

### Option A: GreasyFork (Recommended)

1. **Create Account**
   - Visit https://greasyfork.org/
   - Click "Log in" → Create account

2. **Submit Script**
   - Click "Create new script"
   - Paste contents of `deploy/ghostpost.user.js`
   - Fill in metadata:
     - Name: "Ghostpost Message Detector"
     - Description: "Detects and reveals hidden messages with invisible characters"
     - Category: Social Media Tools
     - Homepage: https://ghostpost.app
     - Source code: https://github.com/your-repo

3. **Add Installation Instructions**
   - Visit script page
   - Users can click "Install this script"
   - Automatically installs with Tampermonkey/Greasemonkey

### Option B: OpenUserJS

1. Visit https://openuserjs.org/
2. Create account
3. Upload script
4. Follow approval process

### Installation for Users

**Via Tampermonkey (Chrome/Firefox):**
1. Install Tampermonkey extension
2. Visit GreasyFork script page
3. Click "Install this script"
4. Confirm installation
5. Reload any page to activate

**Manual Installation:**
1. Copy contents of `deploy/ghostpost.user.js`
2. Open Tampermonkey Dashboard
3. Create new script
4. Paste contents
5. Save
6. Reload pages to activate

## Part 5: Environment Configuration

### Vercel Environment Variables

In Vercel project settings, add:

```
PUBLIC_SUPABASE_URL = https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY = your-anon-key
PRIVATE_SUPABASE_SERVICE_ROLE_KEY = your-service-role-key (optional, for admin operations)
```

### Local Development

Create `.env.local`:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PUBLIC_SUPABASE_URL=https://your-project.supabase.co
ENV PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

EXPOSE 3000

CMD ["node", "build/index.js"]
```

```bash
# Build image
docker build -t ghostpost:latest .

# Run container
docker run -p 3000:3000 \
  -e PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  ghostpost:latest
```

## Part 6: Post-Deployment Verification

### Checklist

- [ ] Database tables and indexes visible in Supabase dashboard
- [ ] RLS policies enabled on both tables
- [ ] API endpoints responding correctly
- [ ] Browser extension loads without errors
- [ ] Extension detects messages on test social media pages
- [ ] Userscript loads and scans for messages
- [ ] Create → Encode → Detect → Reveal flow works end-to-end
- [ ] Password protection working
- [ ] Expiry enforcement working
- [ ] Analytics tracking events

### End-to-End Test

1. **Create Secure Note**
   - Go to https://ghostpost.app/compose
   - Select "Secure Notes" mode
   - Enter secret: "This is a test message"
   - Enter visible: "Check this out"
   - Set expiry: 24 hours
   - Click Create
   - Copy encoded message

2. **Post Message**
   - Go to X.com
   - Create new post
   - Paste encoded message (include visible text + encoded)
   - Post

3. **Detect via Extension**
   - Refresh X.com feed
   - Browser extension should highlight post
   - Click reveal button
   - Should open decode page with message

4. **Verify Reveal**
   - Paste message in decode page
   - Click Reveal
   - Should show "This is a test message"
   - Show metadata (creation time, reveal count)

5. **Test Expiry**
   - Try revealing again after expiry time
   - Should show "This note has expired"

### Monitoring

**Track Errors:**
```bash
# Vercel logs
vercel logs ghostpost

# Supabase logs
# Dashboard → Logs → API Requests
```

**Monitor Usage:**
```sql
-- Check reveal counts
SELECT COUNT(*) as total_reveals, 
       COUNT(DISTINCT revealer_fingerprint) as unique_users
FROM note_reveal_records;

-- Check expired notes
SELECT COUNT(*) as expired_notes
FROM secure_notes
WHERE status = 'expired';
```

## Troubleshooting

### Database Migration Fails

**Error: "relation already exists"**
```sql
-- Check if tables already exist
SELECT * FROM information_schema.tables 
WHERE table_name IN ('secure_notes', 'note_reveal_records');

-- If they exist, either:
-- 1. Drop and recreate: DROP TABLE secure_notes CASCADE;
-- 2. Or skip this step (already migrated)
```

**Error: "Permission denied"**
- Ensure using service role key (not anon key) for admin operations
- Check RLS policies aren't blocking inserts

### API Endpoints Not Working

**Error: 502 Bad Gateway**
- Check Vercel deployment logs
- Verify environment variables set
- Test locally: `npm run build && npm run preview`

**Error: CORS errors in browser**
- Verify CORS headers in endpoints
- Check browser console for exact error
- Manually add headers if needed:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
```

### Extension Not Detecting Messages

**Check console:**
```javascript
// Open DevTools (F12)
// Type in console:
window.ghostpost.scan() // Force rescan

// Should see detection logs
```

**Verify message format:**
- Message must have visible text + invisible characters
- Format: "visible text ﻿[invisible]﻿"

### Userscript Not Working

**Check Tampermonkey dashboard:**
- Extension enabled?
- Script enabled in dashboard?
- Site in @match pattern?

**Test manually:**
```javascript
// Open console on page with encoded message
window.ghostpost.scan()
window.ghostpost.messages // Should show detected messages
```

## Rollback Procedure

If issues occur after deployment:

### Database
```sql
-- Soft rollback (disable without data loss)
DROP TRIGGER tr_update_unique_revealers ON note_reveal_records;
DROP TRIGGER tr_update_secure_notes_timestamp ON secure_notes;
DROP POLICY "Owners can update secure notes" ON secure_notes;

-- Full rollback (dangerous - deletes data)
DROP TABLE note_reveal_records CASCADE;
DROP TABLE secure_notes CASCADE;
```

### API
```bash
# Vercel
vercel rollback

# Custom server
git revert <commit-hash>
git push origin main
# systemctl restart ghostpost
```

### Extension
- Users will get update prompt
- Or manually downgrade in Chrome

## Support

For deployment issues:
- Check GitHub Issues: https://github.com/rkendel1/ghostpost/issues
- Email: support@ghostpost.app
- Discord: https://discord.gg/ghostpost

---

**Deployment Completed!** 🎉

Your Ghostpost system is now live. Monitor logs and analytics to ensure smooth operation.
