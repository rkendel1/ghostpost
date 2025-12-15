# Supabase Configuration for OAuth Redirect Fix

## Issue

After configuring OAuth providers in Supabase, users were being redirected to `localhost:3000` instead of the production domain after social login.

## Root Cause

The Supabase **Site URL** configuration in the dashboard was set to `http://localhost:3000`, which is used as the default redirect URL for OAuth callbacks.

## Solution

### 1. Update Supabase Site URL Configuration

**CRITICAL**: You must update the Supabase Site URL in your project settings:

1. Go to your Supabase Dashboard: https://app.supabase.com/project/gadnzoaqvpcwrmslmlje
2. Navigate to **Settings** → **General** → **Configuration**
3. Find **Site URL** setting
4. Update it from `http://localhost:3000` to your production URL (e.g., `https://ghostpost.vercel.app`)
5. Click **Save**

### 2. Add Redirect URLs to Allowed List

In the same configuration page:

1. Scroll to **Redirect URLs** section
2. Add the following URLs (one per line):
   ```
   http://localhost:3000/**
   https://ghostpost.vercel.app/**
   https://your-production-domain.com/**
   ```
3. This allows redirects to both local development and production

### 3. Auth Callback Route

A new auth callback route has been created at `/auth/callback` that properly handles OAuth redirects:

- **File**: `src/routes/auth/callback/+server.ts`
- **Purpose**: Exchanges OAuth code for session and redirects to dashboard
- **Redirect URL to use in OAuth configs**: `https://your-domain.com/auth/callback`

### 4. OAuth Provider Configuration

For each OAuth provider configured in Supabase, the callback URL should be:

```
https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback
```

This is Supabase's callback URL, which then redirects to your app's `/auth/callback` route.

## Changes Made

### Code Changes:

1. **Removed Facebook provider** from all authentication options
2. **Updated auth store** (`src/lib/stores/auth.ts`):
   - Removed Facebook from provider types
   - Changed redirectTo from `/dashboard` to `/auth/callback`
   - Removed Facebook scopes
3. **Updated AuthModal** (`src/lib/components/AuthModal.svelte`):
   - Removed Facebook login button
4. **Updated SocialAccountsManager** (`src/lib/components/SocialAccountsManager.svelte`):
   - Removed Facebook from provider list
5. **Created auth callback route** (`src/routes/auth/callback/+server.ts`):
   - Handles OAuth code exchange
   - Redirects to dashboard after successful auth

### Configuration Required (Manual Steps):

1. Update Supabase Site URL to production domain
2. Add allowed redirect URLs in Supabase dashboard
3. Optionally disable Facebook provider in Supabase dashboard

## Testing

### Local Development:

1. Ensure Supabase Site URL includes `http://localhost:3000` in allowed redirects
2. Test OAuth login flows for Google, GitHub, Discord, and Twitter
3. Verify redirect to `/dashboard` after successful login

### Production:

1. Update Site URL to production domain
2. Test each OAuth provider
3. Verify users are redirected to production domain (not localhost)
4. Check that social account tokens are stored correctly

## Additional Notes

- The app uses `window.location.origin` for dynamic redirect URLs, which should work across environments
- Facebook has been completely removed as requested
- All OAuth flows now go through the `/auth/callback` route for consistent handling
- The server-side hooks in `src/hooks.server.ts` automatically store OAuth tokens in the `social_accounts` table

## Support

If redirects are still going to localhost after these changes:

1. Clear browser cookies and cache
2. Verify Supabase Site URL is set correctly
3. Check browser console for any errors
4. Ensure the callback URL in OAuth provider configs matches Supabase's callback URL
