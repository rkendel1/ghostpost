# 🚀 Ghostpost Deployment Package

Complete deployment files for production deployment of Ghostpost.

## 📦 Contents

### Browser Extension
- **ghostpost-extension.zip** (106 KB) - Ready-to-upload Chrome extension package
  - Manifest V3 compatible
  - All scripts, styles, icons included
  - WASM module included

### Userscript
- **ghostpost.user.js** - Tampermonkey/Greasemonkey userscript
  - Works on all browsers with Tampermonkey installed
  - Same detection logic as browser extension
  - Smaller footprint, no installation required

### Documentation
- **DEPLOYMENT_GUIDE.md** - Complete step-by-step deployment instructions
  - Database migration setup
  - API endpoint deployment
  - Browser extension submission
  - Userscript deployment
  - Environment configuration
  - Troubleshooting guide

### Scripts
- **run-migration.js** - Database migration helper
  - Shows migration summary
  - Provides verification queries
  - Guides manual execution

- **verify-deployment.sh** - Pre-deployment verification
  - Checks all dependencies
  - Verifies source files
  - Tests build ability
  - Generates deployment readiness report

### Configuration
- **.env.example** - Environment variables template
  - Copy to .env.local before deployment
  - Fill in your Supabase credentials

## 🚀 Quick Start

### 1. Verify Everything is Ready
```bash
bash deploy/verify-deployment.sh
```

This will check:
- ✅ Node.js and npm installed
- ✅ Environment variables
- ✅ All source files present
- ✅ WASM compiled
- ✅ Database migration SQL valid
- ✅ Extension files complete
- ✅ Build successful

### 2. Set Up Environment
```bash
# Copy template
cp deploy/.env.example .env.local

# Edit with your credentials
# Required:
#   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply Database Migration
```bash
# Option A: Via Supabase Dashboard (easiest)
# - Go to SQL Editor
# - Copy contents of supabase/migrations/20260811_create_secure_notes.sql
# - Paste and run

# Option B: Via CLI
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option C: Show migration details
node deploy/run-migration.js
```

### 4. Deploy API Endpoints
```bash
# Vercel (recommended)
npm run build
vercel deploy --prod

# Or custom server
npm run build
# Deploy build/ directory to your server
```

### 5. Install Browser Extension
```bash
# For Chrome Web Store
# - Extract ghostpost-extension.zip
# - Visit https://chrome.google.com/webstore/developer/dashboard
# - Upload ghostpost-extension.zip
# - Fill in store listing details
# - Submit for review (1-3 business days)

# For local testing
# - Go to chrome://extensions
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select browser-extension/ folder
```

### 6. Install Userscript
```bash
# GreasyFork (recommended)
# - Visit https://greasyfork.org/
# - Click "Create new script"
# - Paste contents of ghostpost.user.js
# - Fill in metadata and submit

# Local installation
# - Install Tampermonkey extension
# - Create new script in Tampermonkey
# - Paste ghostpost.user.js contents
# - Save and test
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Run `bash deploy/verify-deployment.sh`
- [ ] All checks pass
- [ ] Environment variables configured
- [ ] Database backup taken

### Database Migration
- [ ] Migration SQL executed successfully
- [ ] All tables created (run verification queries)
- [ ] All indexes created
- [ ] All RLS policies enabled
- [ ] Triggers created and working

### API Deployment
- [ ] Build successful (`npm run build`)
- [ ] Endpoints deployed to production
- [ ] Environment variables set in production
- [ ] Test endpoints with curl:
  ```bash
  curl https://your-domain/api/secure-notes/status?note_id=test
  # Should return: {"success":false,"error":"Note not found"}
  ```

### Browser Extension
- [ ] Extension uploaded to Chrome Web Store
- [ ] Store listing complete and reviewed
- [ ] Extension approved (1-3 days)
- [ ] Users can install via Web Store

### Userscript
- [ ] Userscript submitted to GreasyFork
- [ ] Metadata complete
- [ ] Approved and published

### End-to-End Testing
- [ ] Create secure note flow works
- [ ] Encode message with invisible characters
- [ ] Post message to social media
- [ ] Browser extension detects it
- [ ] Click reveal button
- [ ] Decryption successful
- [ ] Password protection working
- [ ] Expiry enforcement working
- [ ] Analytics tracking events

## 📊 File Sizes

```
ghostpost-extension.zip    106 KB  Chrome extension
ghostpost.user.js          ~25 KB  Userscript
DEPLOYMENT_GUIDE.md        ~30 KB  Documentation
run-migration.js           ~6 KB   Migration helper
verify-deployment.sh       ~5 KB   Verification script
```

## 🔒 Security Checklist

- [ ] No API keys in extension code
- [ ] No service role key in frontend
- [ ] HTTPS enforced for all API calls
- [ ] RLS policies enabled on all tables
- [ ] CORS headers correct
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Database backups configured

## 📞 Support

### Troubleshooting

**Extension not detecting messages:**
```javascript
// Open DevTools (F12) on page with encoded message
window.ghostpost.scan()  // Force rescan
```

**API endpoints not responding:**
```bash
# Check deployment logs
vercel logs ghostpost

# Test endpoint
curl https://your-domain/api/secure-notes/status

# Should return an error (not 502)
```

**Database migration failed:**
- Check Supabase dashboard for error logs
- Verify credentials are correct
- Ensure you have admin access
- Check firewall/network rules

### Useful Commands

```bash
# View deployment logs
vercel logs ghostpost

# Check database status
# Supabase Dashboard → SQL Editor → Run:
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public';

# Force rebuild
npm run build

# Test locally
npm run preview

# Verify extension loads
# Chrome DevTools → F12 → Extensions
```

## 📚 Related Documentation

- **DEPLOYMENT_GUIDE.md** - Detailed deployment instructions
- **../SYSTEM_IMPLEMENTATION_SUMMARY.md** - System overview
- **../DOM_WALKER_GUIDE.md** - Message detection architecture
- **../IMPLEMENTATION_CHECKLIST.md** - Feature completion status

## 🎯 Deployment Timeline

**Day 1:**
- ✅ Verify deployment ready
- ✅ Apply database migration
- ✅ Deploy API endpoints
- ✅ Test API endpoints

**Day 2-3:**
- ✅ Submit browser extension to Chrome Web Store
- ✅ Submit userscript to GreasyFork
- ⏳ Wait for approval (1-3 business days)

**Day 4+:**
- ✅ Extensions approved and live
- ✅ Promote to users
- ✅ Monitor analytics and logs

## ✨ Post-Deployment

After successful deployment:

1. **Monitor Logs**
   ```bash
   # Vercel
   vercel logs ghostpost -f

   # Supabase
   # Dashboard → Logs → API Requests
   ```

2. **Track Metrics**
   ```sql
   -- Messages created
   SELECT COUNT(*) FROM secure_notes;

   -- Reveals recorded
   SELECT COUNT(*) FROM note_reveal_records;

   -- Unique users
   SELECT COUNT(DISTINCT revealer_fingerprint) FROM note_reveal_records;
   ```

3. **Update Documentation**
   - Add deployment notes to wiki
   - Document any custom configurations
   - Record production URLs

4. **Communicate with Users**
   - Announce new features
   - Provide installation instructions
   - Share troubleshooting guide

## 🆘 Emergency Rollback

If critical issues occur:

```bash
# Vercel
vercel rollback

# Custom server
git revert <commit-hash>
git push origin main
# Redeploy with previous version
```

---

**Deployment Package Version:** 2.0.0  
**Created:** August 11, 2026  
**Status:** ✅ Production Ready

For questions: support@ghostpost.app
