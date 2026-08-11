# ⚡ Ghostpost Deployment Quick Reference

## 🎯 One-Page Deployment Summary

### What You Have
- ✅ **ghostpost-extension.zip** (106 KB) - Ready for Chrome Web Store
- ✅ **ghostpost.user.js** - Userscript for Tampermonkey
- ✅ **20260811_create_secure_notes.sql** - Database migration
- ✅ All API endpoints built and tested
- ✅ Full documentation and verification tools

### Three Steps to Production

#### Step 1: Database (Supabase)
```bash
# Option A: Dashboard (easiest)
# 1. Go to SQL Editor
# 2. Create new query
# 3. Paste: deploy/20260811_create_secure_notes.sql
# 4. Click "Run"

# Option B: CLI
supabase link --project-ref YOUR_REF
supabase db push

# Verify:
SELECT COUNT(*) FROM secure_notes;  # Should work
SELECT COUNT(*) FROM note_reveal_records;  # Should work
```

#### Step 2: API (Vercel or your server)
```bash
# Configure environment
export PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export PUBLIC_SUPABASE_ANON_KEY=your-key-here

# Build and deploy
npm run build
vercel deploy --prod  # or deploy to your server

# Test
curl https://your-domain/api/secure-notes/status?note_id=test
# Returns: {"success":false,"error":"Note not found"}  ✓
```

#### Step 3: Extensions
```bash
# Browser Extension
# 1. Upload ghostpost-extension.zip to Chrome Web Store
# 2. Fill store listing
# 3. Submit for review (1-3 days)

# Userscript
# 1. Visit greasyfork.org, create account
# 2. Create new script, paste ghostpost.user.js
# 3. Submit for approval
```

---

## 📋 Pre-Deployment Verification

```bash
# Run verification
bash deploy/verify-deployment.sh

# Should show: ✅ All checks passed!
```

---

## 🔑 Environment Variables Required

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get from: Supabase Dashboard → Settings → API

---

## ✅ Deployment Checklist

- [ ] Run `bash deploy/verify-deployment.sh` ✓
- [ ] Set environment variables
- [ ] Run database migration
- [ ] Build: `npm run build` ✓
- [ ] Deploy API endpoints
- [ ] Upload extension to Chrome Web Store
- [ ] Upload userscript to GreasyFork
- [ ] Test full flow (Create → Post → Detect → Reveal)

---

## 🧪 Test Deployment

```bash
# 1. Create secure note
# Go to https://your-domain/compose
# Select "Secure Notes" → Create note with text "Hello World"
# Copy encoded message

# 2. Post message
# Go to X.com or Reddit
# Create post with encoded message

# 3. Detect with extension
# Extension should highlight post
# Click "Reveal" button

# 4. Verify
# Should show "Hello World" in decode page
# Metadata shows creation time, reveal count
```

---

## 📊 What Gets Deployed

| Component | Package | Size | Destination |
|-----------|---------|------|-------------|
| Browser Extension | ghostpost-extension.zip | 106 KB | Chrome Web Store |
| Userscript | ghostpost.user.js | 11 KB | GreasyFork |
| API Endpoints | build/ | ~2 MB | Vercel / Your Server |
| Database | SQL migration | 6 KB | Supabase |

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| "Note not found" on status check | ✓ Normal - means API is working |
| Extension not loading | Check chrome://extensions for errors |
| Messages not detected | Ensure INVISIBLE_CHARS in content.js match encoding |
| API 502 error | Check Vercel logs, verify env vars set |
| Database connection fails | Verify SUPABASE_URL and ANON_KEY |

---

## 📞 Support Links

- **Issue Tracker**: https://github.com/rkendel1/ghostpost/issues
- **Email**: support@ghostpost.app
- **Documentation**: See deploy/DEPLOYMENT_GUIDE.md

---

## 🎯 Success Criteria

Your deployment is complete when:

✅ Database migration successful  
✅ All API endpoints responding  
✅ Browser extension in Chrome Web Store  
✅ Userscript on GreasyFork  
✅ End-to-end test passes (Create → Post → Detect → Reveal)  
✅ Analytics showing usage  

---

## 📝 Estimated Timeline

- **Database Migration**: 5 minutes
- **API Deployment**: 5 minutes
- **Extension Upload**: 2-5 minutes (wait 1-3 days for approval)
- **Userscript Upload**: 2-5 minutes (wait 1-3 days for approval)
- **Testing**: 15 minutes
- **Total**: ~30 minutes + 1-3 days waiting for approvals

---

**Version**: 2.0.0  
**Last Updated**: August 11, 2026  
**Status**: ✅ Production Ready
