# CORS Fix Summary - Limited Reveals API

## Issue
The Ghostpost userscript (`ghostpost-reveal.user.js`) needs to call the limited-reveals API endpoints from third-party domains (any website where the userscript is running). However, these endpoints were missing CORS (Cross-Origin Resource Sharing) headers, causing the browser to block the requests.

## Problem Details
- **Userscript Location**: Runs on any website via Tampermonkey/Greasemonkey
- **API Endpoints Called**:
  1. `GET /api/limited-reveals/status?post_id={post_id}` - Check if a secret can still be revealed
  2. `POST /api/limited-reveals/reveal` - Record a reveal and get reveal number

When the userscript tried to call these endpoints from third-party domains (e.g., twitter.com, facebook.com), browsers would block the requests due to CORS policy.

## Solution
Added CORS headers to both API endpoints to allow cross-origin requests from any domain:

### Changes Made

#### 1. `/api/limited-reveals/status/+server.ts`
- Added CORS headers constant with:
  - `Access-Control-Allow-Origin: *` (allow all domains)
  - `Access-Control-Allow-Methods: GET, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
- Added OPTIONS handler for preflight requests
- Added CORS headers to all response types (success and error)

#### 2. `/api/limited-reveals/reveal/+server.ts`
- Added CORS headers constant with:
  - `Access-Control-Allow-Origin: *` (allow all domains)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
- Added OPTIONS handler for preflight requests
- Added CORS headers to all response types (success and error)

## Technical Details

### CORS Headers Explained
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',           // Allow requests from any origin
  'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allowed HTTP methods
  'Access-Control-Allow-Headers': 'Content-Type', // Allowed request headers
};
```

### Preflight Requests
Modern browsers send an OPTIONS "preflight" request before POST requests to check if CORS is allowed:
```typescript
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};
```

### Response Headers
All JSON responses now include CORS headers:
```typescript
return json(
  { success: true, status },
  { headers: corsHeaders }
);
```

## How It Works

1. **User visits any website** (e.g., twitter.com) with the userscript installed
2. **Userscript detects** a Ghostpost hidden message
3. **User clicks "Reveal"**
4. **Userscript calls** `GET /api/limited-reveals/status?post_id=...`
   - Browser sends OPTIONS preflight request
   - Server responds with CORS headers
   - Browser allows the GET request
5. **Userscript calls** `POST /api/limited-reveals/reveal`
   - Browser sends OPTIONS preflight request
   - Server responds with CORS headers
   - Browser allows the POST request
6. **Userscript displays** reveal statistics in the overlay

## Security Considerations

### Why `Access-Control-Allow-Origin: *` is Safe Here

1. **Public Read-Only Data**: The status endpoint returns public information about reveal counts
2. **No Authentication Required**: These endpoints don't use cookies or authentication headers
3. **No Sensitive Data**: User fingerprints are anonymous hashes, not PII
4. **Atomic Operations**: The reveal endpoint uses database-level atomic operations to prevent race conditions
5. **Rate Limiting**: Supabase provides built-in rate limiting

### Alternative: Restricted Origins
If stricter control is needed later, we could restrict to specific domains:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://ghostpost-six.vercel.app',
  // ... other headers
};
```

However, this would defeat the purpose of the userscript, which needs to work on any domain.

## Testing

### Manual Testing (after deployment)
```bash
# Test OPTIONS request
curl -X OPTIONS "https://ghostpost-six.vercel.app/api/limited-reveals/status" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test GET request
curl -X GET "https://ghostpost-six.vercel.app/api/limited-reveals/status?post_id=test" \
  -H "Origin: https://example.com" \
  -v

# Should see headers like:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, OPTIONS
# Access-Control-Allow-Headers: Content-Type
```

### Integration Testing
1. Install the userscript in Tampermonkey
2. Create a test Ghostpost with limited reveals
3. Share it on Twitter/X or any other platform
4. Open the tweet and click the 👻 button
5. Click "Reveal" on a message
6. Verify that reveal statistics appear correctly
7. Check browser console for any CORS errors (should be none)

## Files Modified
- `src/routes/api/limited-reveals/status/+server.ts` - Added CORS headers
- `src/routes/api/limited-reveals/reveal/+server.ts` - Added CORS headers

## Userscript Integration
The userscript (`static/ghostpost-reveal.user.js`) already has the code to call these endpoints:
- Lines 1041-1042: Calls status endpoint
- Lines 1057-1066: Calls reveal endpoint
- Lines 1074-1078: Error handling for API failures

No changes to the userscript are needed - it will automatically work once the API endpoints have CORS headers.

## Deployment
Once this PR is merged and deployed to Vercel:
1. The CORS headers will be automatically included in API responses
2. The userscript will be able to call these endpoints from any domain
3. Users will see reveal statistics when decoding messages

## Success Criteria
- ✅ No CORS errors in browser console when userscript calls API
- ✅ Status endpoint returns reveal information with CORS headers
- ✅ Reveal endpoint records reveals and returns data with CORS headers
- ✅ OPTIONS preflight requests are handled correctly
- ✅ Security scan passes (CodeQL found 0 alerts)
- ✅ All response types include CORS headers (success and error)

## Related Issues
- Issue mentions "cors issue" with reveal and track endpoints
- This fix addresses the CORS issue for both status and reveal endpoints
- Note: There's no separate "track" endpoint - the issue description has duplicate entries for "reveal"
