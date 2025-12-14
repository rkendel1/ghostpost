# OAuth Social Login - Testing Guide

This guide provides step-by-step instructions for testing the new OAuth social login functionality.

## Prerequisites

1. Development server running (`npm run dev`)
2. Access to Supabase dashboard
3. OAuth providers configured (see OAUTH_SETUP.md)

## Test Cases

### 1. Visual UI Testing

#### Login Modal with Social Buttons
- [ ] Navigate to the homepage
- [ ] Click "Sign In" or try to access a protected route
- [ ] Verify AuthModal displays with:
  - Google button with blue icon
  - GitHub button with icon
  - Facebook, Discord, Twitter buttons in second row
  - "or" separator between social and email login
  - Email/password fields below
  - Clean, modern layout

#### Settings Page
- [ ] Sign in (email or social)
- [ ] Navigate to `/settings`
- [ ] Verify three tabs: Connected Accounts, Profile, Security
- [ ] Check that Connected Accounts tab shows:
  - Grid of provider cards
  - Provider icons and names
  - Connection status for each
  - Connect buttons for disconnected accounts
  - Disconnect buttons for connected accounts

### 2. Email/Password Authentication (Existing)

These tests verify existing functionality still works:

- [ ] Sign up with email/password
- [ ] Verify email sent (check Supabase Auth logs)
- [ ] Sign in with email/password
- [ ] Sign out
- [ ] Verify session cleared

### 3. OAuth Social Login (New)

For each provider (Google, GitHub, Facebook, Discord, Twitter):

#### Initial Connection
- [ ] Click the provider button in AuthModal
- [ ] Verify redirect to provider's OAuth page
- [ ] Grant permissions
- [ ] Verify redirect back to `/dashboard`
- [ ] Check that session is established
- [ ] Navigate to `/settings` > Connected Accounts
- [ ] Verify provider shows as connected with:
  - Username/email
  - Connection date
  - Disconnect button

#### Token Storage Verification
- [ ] In Supabase dashboard, check `social_accounts` table
- [ ] Verify row exists with:
  - Correct user_id
  - Provider name
  - Provider user ID
  - Access token (non-null)
  - Refresh token (if applicable)
  - is_active = true

#### Reconnecting After Disconnect
- [ ] In Settings, disconnect an account
- [ ] Verify account shows as "Not connected"
- [ ] Click Connect button
- [ ] Complete OAuth flow
- [ ] Verify account shows as connected again

#### Multiple Sessions
- [ ] Connect with one provider
- [ ] Sign out
- [ ] Connect with a different provider using same email
- [ ] Verify both accounts are stored and accessible

### 4. Account Management Features

#### Viewing Connected Accounts
- [ ] Navigate to `/settings`
- [ ] Verify all connected accounts listed
- [ ] Check last used dates are accurate
- [ ] Verify connection status indicators

#### Disconnecting Accounts
- [ ] Click "Disconnect" on a connected account
- [ ] Confirm the action
- [ ] Verify account changes to "Not connected"
- [ ] Check database: is_active should be false

#### Token Expiration Handling
- [ ] Manually set token_expires_at in past in database
- [ ] Reload settings page
- [ ] Verify expired token warning shown
- [ ] Click "Refresh Token"
- [ ] Verify user prompted to reconnect

#### Profile Tab
- [ ] Switch to Profile tab
- [ ] Verify email displayed
- [ ] Verify user ID shown
- [ ] Verify account creation date

#### Security Tab
- [ ] Switch to Security tab
- [ ] Verify authentication method shown
- [ ] Test sign out button
- [ ] Verify redirect to home page

### 5. Navigation Integration

- [ ] Sign in with any method
- [ ] Open navigation drawer/menu
- [ ] Verify "Settings" link appears
- [ ] Click Settings link
- [ ] Verify navigation to settings page
- [ ] Sign out
- [ ] Verify Settings link no longer visible

### 6. Protected Routes

- [ ] While signed out, try to access `/dashboard`
- [ ] Verify AuthGuard modal shows
- [ ] Sign in with social provider
- [ ] Verify access granted to dashboard
- [ ] Verify can access `/settings`
- [ ] Verify can access `/compose`

### 7. Error Handling

#### OAuth Cancellation
- [ ] Start OAuth flow
- [ ] Cancel/deny on provider page
- [ ] Verify user returned to app
- [ ] Verify no error state stuck in UI

#### Invalid OAuth Configuration
- [ ] (Admin) Temporarily break OAuth config in Supabase
- [ ] Try to sign in
- [ ] Verify appropriate error message
- [ ] (Admin) Fix configuration

#### Network Errors
- [ ] (With dev tools) Throttle network
- [ ] Try to load connected accounts
- [ ] Verify loading state shows
- [ ] Verify error message if timeout

### 8. Database Integrity

#### Row Level Security
- [ ] Sign in as User A
- [ ] Note User A's social account IDs
- [ ] Sign out and sign in as User B
- [ ] Try to query User A's accounts via API
- [ ] Verify access denied (403/404)

#### Cascade Deletion
- [ ] Create test user with connected accounts
- [ ] Delete user in Supabase Auth
- [ ] Verify social_accounts rows also deleted

### 9. Performance Testing

#### Multiple Accounts
- [ ] Connect all 5 providers
- [ ] Navigate to Settings
- [ ] Verify page loads quickly
- [ ] Check database query count (should be minimal)

#### Hooks Performance
- [ ] Sign in with OAuth
- [ ] Navigate between pages
- [ ] Check that hooks.server.ts doesn't duplicate accounts
- [ ] Verify one social_accounts row per provider

### 10. Mobile/Responsive Testing

- [ ] Open on mobile device/responsive mode
- [ ] Test AuthModal layout
- [ ] Verify social buttons sized appropriately
- [ ] Test Settings page on mobile
- [ ] Verify provider cards stack vertically
- [ ] Test OAuth flow on mobile browser

## Expected Outcomes

### After Successful OAuth Login
1. User is redirected to `/dashboard`
2. Session established in browser
3. social_accounts table has new row
4. Settings page shows connected account
5. Navigation includes Settings link

### Security Checks Passed
- ✅ No CodeQL alerts
- ✅ RLS policies enforced
- ✅ Tokens stored securely (with production encryption note)
- ✅ Users can only access own data
- ✅ No token exposure to client-side

### Code Quality Checks Passed
- ✅ TypeScript type checking passes
- ✅ Prettier formatting passes
- ✅ Build completes successfully
- ✅ No console errors in browser

## Troubleshooting

### OAuth Flow Doesn't Complete
- Check Supabase OAuth provider configuration
- Verify redirect URLs match exactly
- Check browser console for errors
- Verify cookies enabled

### Tokens Not Stored
- Check hooks.server.ts logs
- Verify social_accounts table exists
- Check RLS policies allow inserts
- Verify provider metadata format

### Settings Page Not Loading
- Check authentication state
- Verify /api/social-accounts endpoint works
- Check browser network tab for API errors
- Verify user has valid session

## Manual Testing Checklist

Before marking this feature complete:

- [ ] All social providers tested (at least Google and GitHub)
- [ ] Token storage verified in database
- [ ] Settings page displays correctly
- [ ] Disconnect/reconnect flow works
- [ ] Mobile layout tested
- [ ] No console errors
- [ ] Database queries optimized
- [ ] Documentation complete and accurate

## Automated Testing

For future implementation:
- Unit tests for auth store functions
- Integration tests for API endpoints
- E2E tests for OAuth flows
- Component tests for UI elements

## Production Checklist

Before deploying to production:
- [ ] All OAuth providers configured in production Supabase
- [ ] Production domain added to OAuth redirect URLs
- [ ] Token encryption implemented (or documented as TODO)
- [ ] Rate limiting on OAuth endpoints
- [ ] Monitoring and logging configured
- [ ] Error tracking setup
- [ ] Performance metrics baseline
- [ ] Security audit completed
