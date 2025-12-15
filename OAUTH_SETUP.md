# OAuth Social Login Setup Guide

This guide explains how to configure OAuth social login providers for GhostPost. The implementation uses Supabase's built-in OAuth support for seamless integration with popular social platforms.

## Overview

GhostPost now supports modern OAuth-based social login with the following providers:

- 🔵 Google
- 🐙 GitHub
- 💬 Discord
- 𝕏 Twitter/X

When users connect their social accounts, OAuth tokens are securely stored in the `social_accounts` table, enabling future features like automated posting to connected platforms.

## Prerequisites

- A Supabase project (the app uses: https://gadnzoaqvpcwrmslmlje.supabase.co)
- Access to each OAuth provider's developer portal
- Admin access to your Supabase project dashboard

## Setup Steps

### 1. Run the Database Migration

First, apply the social accounts migration to create the necessary database tables:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL file directly in Supabase SQL Editor
# File: supabase/migrations/20241214_social_accounts.sql
```

This creates:

- `social_accounts` table for storing OAuth tokens
- Proper indexes and RLS policies
- Link to the existing `posts` table

### 2. Configure OAuth Providers in Supabase

For each provider you want to enable:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Enable the provider (Google, GitHub, Discord, or Twitter)
4. Add the OAuth credentials (see provider-specific instructions below)
5. Set the redirect URL (handled automatically by Supabase)

### 3. Provider-Specific Configuration

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard:
   - Paste Client ID and Client Secret
   - Scopes: `openid email profile` (default)

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - Homepage URL: Your app URL
   - Authorization callback URL: `https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback`
4. Copy the Client ID and generate a Client Secret
5. In Supabase Dashboard:
   - Paste Client ID and Client Secret
   - Scopes: `user:email read:user` (default)

#### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to OAuth2 settings
4. Add redirect URL: `https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard:
   - Paste Client ID and Client Secret
   - Scopes: `identify email` (default)

#### Twitter/X OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app
3. Enable OAuth 2.0
4. Set callback URL: `https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard:
   - Paste Client ID and Client Secret
   - Scopes: `tweet.read users.read offline.access` (default)

## Features

### User Account Management

Users can manage their connected accounts at `/settings`:

- View all connected social accounts
- See connection status and last used date
- Disconnect accounts
- Refresh expired tokens
- Connect new accounts

### OAuth Token Storage

When users connect a social account:

1. OAuth flow is initiated via Supabase Auth
2. On successful authentication, tokens are stored in `social_accounts` table
3. Tokens include:
   - Access token (for API calls)
   - Refresh token (for token renewal)
   - Token expiration date
   - OAuth scopes granted
   - Provider user information

### Security Features

- ✅ Row Level Security (RLS) policies ensure users only access their own data
- ✅ OAuth tokens stored securely (consider encrypting in production)
- ✅ Support for token refresh flows
- ✅ Ability to deactivate/disconnect accounts
- ✅ Automatic cleanup on user deletion (CASCADE)

## Future Enhancements

The OAuth token storage enables future features:

1. **Automated Posting**: Post directly to connected social accounts
2. **Cross-Platform Scheduling**: Schedule posts to multiple platforms
3. **Analytics Sync**: Pull engagement data from social platforms
4. **Account Insights**: Show follower counts, post performance, etc.

## Testing

To test the OAuth integration:

1. Start the development server: `npm run dev`
2. Navigate to the login page
3. Click on a social login button
4. Complete the OAuth flow
5. Check `/settings` to see your connected account
6. Verify the account appears in the `social_accounts` table

## Troubleshooting

### "OAuth Error: Invalid Redirect URI"

- Ensure the redirect URI in the provider settings matches exactly
- Use: `https://gadnzoaqvpcwrmslmlje.supabase.co/auth/v1/callback`

### "Tokens not being stored"

- Check Supabase logs for errors
- Verify the `social_accounts` table exists
- Ensure RLS policies allow inserts

### "Provider not appearing in login modal"

- Verify the provider is enabled in Supabase Dashboard
- Check that credentials are correctly configured
- Clear browser cache and try again

## Support

For issues or questions:

- Check Supabase documentation: https://supabase.com/docs/guides/auth
- Review provider-specific OAuth documentation
- Check the browser console for errors
- Verify database migration was applied successfully

## Production Considerations

Before deploying to production:

1. **Token Encryption**: Consider encrypting OAuth tokens at rest
2. **Token Rotation**: Implement refresh token rotation
3. **Rate Limiting**: Add rate limits to OAuth endpoints
4. **Monitoring**: Set up logging for OAuth failures
5. **HTTPS Only**: Ensure all OAuth flows use HTTPS
6. **Scope Minimization**: Only request necessary OAuth scopes
7. **Token Revocation**: Implement proper token cleanup on account deletion
