# Cross-Site Functionality: How GhostPost Works on Any Website

## Overview

GhostPost is designed to work on **any website** you visit, allowing you to detect and decode hidden messages embedded in text on third-party sites like Twitter/X, Facebook, LinkedIn, Reddit, and more. This document explains the technical mechanisms that enable this cross-site functionality while avoiding security restrictions like CORS (Cross-Origin Resource Sharing).

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How CORS is Avoided](#how-cors-is-avoided)
3. [Userscript Mechanism](#userscript-mechanism)
4. [Browser Extension Mechanism](#browser-extension-mechanism)
5. [API Integration with CORS Support](#api-integration-with-cors-support)
6. [Local Processing Architecture](#local-processing-architecture)
7. [Security Model](#security-model)
8. [Privacy Considerations](#privacy-considerations)

---

## Architecture Overview

GhostPost uses **two complementary approaches** to work across different websites:

1. **Userscript (Tampermonkey/Greasemonkey)** - JavaScript injected into web pages
2. **Browser Extension (Chrome/Edge/Brave)** - Native browser extension with elevated permissions

Both approaches share the same core principle: **Local DOM processing** with minimal API calls that are properly configured for cross-origin requests.

### Key Components

```
┌─────────────────────────────────────────────────────────┐
│ Third-Party Website (e.g., twitter.com, facebook.com)  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  1. Userscript OR Browser Extension Injected        │ │
│ │  2. Scans DOM for invisible Unicode characters      │ │
│ │  3. Detects encoded messages locally                │ │
│ │  4. Decodes using local WASM module                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
                (Optional API Calls)
                          ↓
┌─────────────────────────────────────────────────────────┐
│ GhostPost API (ghostpost-six.vercel.app)               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  - CORS headers allow cross-origin requests         │ │
│ │  - No authentication required for public endpoints  │ │
│ │  - Analytics tracking (optional, privacy-focused)   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## How CORS is Avoided

CORS (Cross-Origin Resource Sharing) is a browser security mechanism that prevents JavaScript on one domain from making requests to another domain. GhostPost overcomes this in **three key ways**:

### 1. **Local DOM Processing (Primary Method)**

The majority of GhostPost's functionality happens **entirely in the browser** without making any external requests:

- **Scanning**: Text nodes in the DOM are scanned for invisible Unicode characters
- **Detection**: Pattern matching identifies potential encoded messages
- **Decoding**: WebAssembly (WASM) module decodes messages locally
- **Display**: Results are shown in an overlay or sidebar

**No CORS issues** because there are no cross-origin HTTP requests for these operations.

### 2. **Explicit CORS Headers (For API Calls)**

When API calls are necessary (e.g., analytics tracking, limited reveals), the GhostPost backend explicitly allows cross-origin requests:

```typescript
// Example from /api/limited-reveals/status/+server.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',        // Allow any origin
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};
```

**Key endpoints with CORS support:**
- `GET /api/limited-reveals/status?post_id={id}` - Check reveal availability
- `POST /api/limited-reveals/reveal` - Record a reveal
- Analytics tracking endpoints (privacy-focused, no PII)

### 3. **Browser Extension Permissions**

Browser extensions can request special permissions that bypass CORS restrictions:

```json
// From browser-extension/manifest.json
{
  "permissions": ["activeTab", "sidePanel", "storage"],
  "host_permissions": ["<all_urls>"]
}
```

These permissions allow the extension to:
- Access page content on any website
- Inject scripts and styles
- Make cross-origin requests (when needed)

---

## Userscript Mechanism

### What is a Userscript?

A userscript is JavaScript code that runs on web pages via a userscript manager like **Tampermonkey** or **Greasemonkey**. The GhostPost userscript (`ghostpost-reveal.user.js`) is injected into every webpage you visit.

### Key Metadata Directives

```javascript
// ==UserScript==
// @name         Ghostpost Reveal
// @namespace    https://ghostpost-six.vercel.app
// @match        *://*/*           // Runs on ALL websites
// @exclude      *://*/login*      // Except login/banking pages
// @grant        none               // No special privileges needed
// @run-at       document-end       // After DOM is loaded
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
// ==/UserScript==
```

### How It Avoids CORS

#### 1. **Runs in Page Context**

With `@grant none`, the userscript runs in the **same security context** as the webpage:

- **No cross-origin restrictions** for accessing DOM
- Can read all text nodes, modify page content, inject UI elements
- Has full access to the page's JavaScript environment

#### 2. **DOM-Only Processing**

The userscript primarily works by:

```javascript
// Scan all text nodes in the document
function scanPage() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent || '';
    
    // Check for invisible Unicode characters
    if (hasInvisibleChars(text)) {
      // Process locally - no HTTP request needed
      detectAndDecode(node, text);
    }
  }
}
```

#### 3. **fetch() Calls Use Same-Origin**

When the userscript makes API calls, they are made **from the page's origin**:

```javascript
// Called from twitter.com, so request appears to come from twitter.com
fetch('https://ghostpost-six.vercel.app/api/limited-reveals/status?post_id=123')
  .then(response => response.json())
  .then(data => {
    // GhostPost API has CORS headers, so this works
  });
```

The GhostPost API returns proper CORS headers allowing the request:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

#### 4. **External Libraries (pako)**

The userscript loads pako (decompression library) from CDN:

```javascript
// @require https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
```

This is loaded once when the userscript initializes, not for each page.

### Security Boundaries

The userscript respects security boundaries by:

- **Excluding sensitive pages**: Banking, login, account pages
- **No credential access**: Doesn't read cookies or auth tokens
- **Local processing only**: Decoding happens in browser memory
- **Optional analytics**: Tracking is privacy-focused (no PII)

---

## Browser Extension Mechanism

### Manifest V3 Architecture

The GhostPost browser extension uses **Manifest V3**, the latest Chrome extension standard:

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "sidePanel", "storage"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["scripts/content.js"],
    "run_at": "document_end"
  }]
}
```

### Content Scripts

**Content scripts** are JavaScript files injected into web pages with special privileges:

```javascript
// From browser-extension/scripts/content.js

// Runs on every webpage
function scanForHiddenContent() {
  // 1. Scan DOM for invisible characters (no CORS issues)
  const textNodes = getAllTextNodes(document.body);
  
  textNodes.forEach(node => {
    const text = extractCompleteText(node);
    
    if (containsHiddenContent(text)) {
      // 2. Message detected - notify background script
      chrome.runtime.sendMessage({
        type: 'HIDDEN_CONTENT_FOUND',
        count: 1
      });
    }
  });
}
```

### How It Avoids CORS

#### 1. **Host Permissions**

`"host_permissions": ["<all_urls>"]` grants the extension access to:
- Read and modify content on any website
- Inject scripts and styles
- Monitor DOM changes

#### 2. **Isolated Worlds**

Content scripts run in an **isolated world**:
- Has access to the page's DOM (can read/modify)
- Has its own JavaScript context (separate from page scripts)
- Can make cross-origin requests without CORS restrictions (with permissions)

#### 3. **Background Service Worker**

```javascript
// From browser-extension/scripts/background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIDDEN_CONTENT_FOUND') {
    // Update badge count
    chrome.action.setBadgeText({ 
      text: String(message.count),
      tabId: sender.tab.id 
    });
  }
});
```

The background worker can make API calls without CORS restrictions.

#### 4. **WebAssembly Decoding**

The extension includes a WASM module for local decoding:

```json
{
  "web_accessible_resources": [{
    "resources": ["wasm/*"],
    "matches": ["<all_urls>"]
  }]
}
```

Decoding happens **entirely in the browser**:

```javascript
// Load WASM module
import init, { decode_message } from './wasm/wasm.js';

await init();

// Decode locally (no API call)
const decoded = decode_message(encodedText);
```

---

## API Integration with CORS Support

### When API Calls Are Made

GhostPost makes API calls in specific scenarios:

1. **Limited Reveals** - Check if a message can still be revealed
2. **Analytics Tracking** - Record decode events (optional, privacy-focused)
3. **Install Tracking** - Track userscript installations (privacy-focused)

### CORS Configuration

All API endpoints that need to be called from third-party sites include CORS headers:

```typescript
// Example: /src/routes/api/limited-reveals/status/+server.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
  // Handle preflight requests
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
};

export const GET: RequestHandler = async ({ url }) => {
  const postId = url.searchParams.get('post_id');
  
  // ... fetch status from database ...
  
  return json({ success: true, status }, { 
    headers: corsHeaders  // Include CORS headers in response
  });
};
```

### Preflight Requests

Modern browsers send **OPTIONS preflight requests** before cross-origin POST/PUT/DELETE:

```
1. Browser: OPTIONS /api/limited-reveals/reveal
   Origin: https://twitter.com
   
2. Server: 204 No Content
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: POST, OPTIONS
   
3. Browser: POST /api/limited-reveals/reveal
   Origin: https://twitter.com
   
4. Server: 200 OK
   Access-Control-Allow-Origin: *
   { "success": true, "reveal_number": 5 }
```

### Why `Access-Control-Allow-Origin: *` is Safe

The GhostPost API uses `*` (allow all origins) because:

1. **Public data** - Reveal counts and analytics are public information
2. **No authentication** - No cookies or auth tokens are used
3. **No sensitive data** - User fingerprints are anonymous hashes, not PII
4. **Atomic operations** - Database-level safeguards prevent race conditions
5. **Rate limiting** - Supabase provides built-in rate limiting

This is **necessary** for the userscript to work from any website.

---

## Local Processing Architecture

### Why Local Processing is Key

The majority of GhostPost's functionality happens **entirely in the browser** to:

1. **Avoid CORS issues** - No external requests needed for core functionality
2. **Maximize privacy** - Sensitive content never leaves the user's device
3. **Improve performance** - No network latency for decoding
4. **Work offline** - Can detect and decode without internet

### WebAssembly Decoding

GhostPost uses a **Rust-compiled WASM module** for encoding/decoding:

```rust
// From wasm/src/hidenly.rs

pub fn decode(encoded: &str) -> Result<Vec<u8>, String> {
    // Extract invisible Unicode characters
    let invisible_chars = extract_invisible_chars(encoded);
    
    // Convert to binary
    let binary = chars_to_binary(invisible_chars);
    
    // Decompress (if compressed)
    let decompressed = decompress(binary)?;
    
    Ok(decompressed)
}
```

This WASM module:
- Runs at near-native speed
- Has no network access (isolated sandbox)
- Processes data entirely in browser memory
- Works identically in userscript and extension

### Detection Algorithm

```javascript
// Simplified detection flow (runs locally)

function detectHiddenContent(text) {
  // 1. Check for invisible Unicode characters
  const invisibleChars = [
    '\u200B',  // Zero Width Space
    '\u200C',  // Zero Width Non-Joiner
    '\u200D',  // Zero Width Joiner
    '\uFEFF',  // Zero Width No-Break Space (delimiter)
    // ... more characters
  ];
  
  const matches = text.match(/[\u200B\u200C\u200D\uFEFF...]/g);
  
  if (!matches || matches.length < 8) {
    return null;  // Not enough invisible chars
  }
  
  // 2. Validate delimiter structure
  const delimiterChar = '\uFEFF';
  const firstDelim = text.indexOf(delimiterChar);
  const secondDelim = text.indexOf(delimiterChar, firstDelim + 1);
  
  if (firstDelim === -1 || secondDelim === -1) {
    return null;  // Invalid format
  }
  
  // 3. Extract encoded content
  const encoded = text.substring(firstDelim, secondDelim + 1);
  
  return {
    detected: true,
    encoded: encoded,
    position: { start: firstDelim, end: secondDelim }
  };
}
```

All of this runs **locally in the browser** - no API calls needed.

---

## Security Model

### Trust Boundaries

GhostPost operates across multiple trust boundaries:

```
User's Browser (Trusted)
├── Userscript/Extension (Trusted)
│   ├── DOM Access (Read-only for detection)
│   ├── WASM Module (Sandboxed)
│   └── API Calls (CORS-enabled, public endpoints)
│
Third-Party Website (Untrusted)
├── Page Content (Scanned for hidden messages)
└── Page Scripts (Isolated from userscript/extension)
│
GhostPost API (Trusted)
└── Public Endpoints (CORS-enabled)
```

### Security Principles

1. **Least Privilege**
   - Userscript uses `@grant none` (minimal permissions)
   - Extension requests only necessary permissions
   - API endpoints are public and require no authentication

2. **Input Validation**
   - All text is validated before decoding
   - Delimiter structure is checked
   - Invalid formats are rejected safely

3. **Isolation**
   - WASM runs in a sandboxed environment
   - Extension content scripts are isolated from page scripts
   - No execution of untrusted code

4. **No Credential Access**
   - Doesn't read cookies or localStorage from third-party sites
   - Doesn't intercept or modify authentication tokens
   - API calls are anonymous (no user tracking)

### Excluded Pages

Both userscript and extension exclude sensitive pages:

```javascript
// Userscript metadata
// @exclude *://*/login*
// @exclude *://*/signin*
// @exclude *://*/banking*
// @exclude *://*/account*
// @exclude *://*.bank.*/*
// @exclude *://*.paypal.*/*
```

This prevents the script from running on pages that might handle sensitive data.

---

## Privacy Considerations

### Data Flow

```
Third-Party Page (e.g., twitter.com)
    ↓
DOM Scanning (Local)
    ↓
Hidden Content Detected (Local)
    ↓
User Clicks "Reveal"
    ↓
┌─────────────────────────────────────┐
│ Option 1: Decode Locally (Default)  │
│ - WASM decoding in browser          │
│ - No data leaves device             │
│ - Maximum privacy                   │
└─────────────────────────────────────┘
    ↓
Display Result (Local)

┌─────────────────────────────────────┐
│ Option 2: With Analytics (Optional) │
│ - Decode locally first              │
│ - Send anonymous event to API       │
│ - No PII collected                  │
└─────────────────────────────────────┘
```

### What is Tracked (Optional)

When analytics are enabled, GhostPost tracks:

- **Post ID** - Which message was decoded
- **Timestamp** - When it was decoded
- **Fingerprint** - Anonymous browser fingerprint (no PII)
- **Platform** - General device info (e.g., "Chrome on Windows")

What is **NOT** tracked:
- ❌ User identity
- ❌ Email or username
- ❌ IP address (beyond what server logs capture)
- ❌ Decoded content
- ❌ Browsing history
- ❌ Cookies or auth tokens

### Install Tracking

The userscript includes privacy-focused install tracking:

```javascript
// Generates anonymous fingerprint
function generateFingerprint() {
  const data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height
  ].join('|');
  
  // Hash to prevent PII
  return simpleHash(data);
}
```

This allows the developers to know:
- How many installations exist
- Which platforms are most popular
- Daily active users (via heartbeat)

Without collecting:
- User identities
- Browsing behavior
- Personal information

### Privacy Best Practices

1. **Local-First** - All processing happens locally when possible
2. **Anonymous** - No PII is collected
3. **Optional** - Analytics tracking is non-critical to functionality
4. **Transparent** - Clear documentation about what is tracked
5. **Minimal** - Only essential data is sent to servers

---

## Platform-Specific Behaviors

### Twitter/X.com

Twitter's DOM structure splits text nodes, requiring special handling:

```javascript
// Simplified extraction with fallbacks
function extractTwitterText(node) {
  // Try simple approach first (90% success rate)
  const nodeText = node.textContent;
  if (hasCompleteMessage(nodeText)) {
    return nodeText;
  }
  
  // Fallback: aggregate parent text
  if (node.parentElement) {
    const parentText = node.parentElement.textContent;
    if (hasCompleteMessage(parentText)) {
      return parentText;
    }
  }
  
  // Advanced fallback: walk up DOM tree
  let current = node.parentElement;
  let depth = 0;
  while (current && depth < 10) {
    const text = current.textContent;
    if (hasCompleteMessage(text)) {
      return text;
    }
    current = current.parentElement;
    depth++;
  }
  
  return null;
}
```

**Why this works**: Twitter's `full_text` API field preserves all invisible Unicode characters. The DOM may split them visually, but they're all accessible.

See `XCOM_API_BEHAVIOR.md` for detailed documentation.

### Facebook

Facebook aggressively normalizes text, which can sometimes strip invisible characters. GhostPost works best when:

- Content is copy/pasted directly
- Using the userscript/extension to detect on the page
- Avoiding Facebook's built-in sharing tools (which may normalize)

### LinkedIn

LinkedIn preserves invisible characters well. The extension/userscript works reliably on:
- Posts in feed
- Comments
- Direct messages

### General Sites

For other websites, GhostPost:
- Scans all text nodes in the DOM
- Detects invisible character patterns
- Works on any site that preserves Unicode text

---

## Debugging and Development

### Testing CORS Locally

```bash
# Test OPTIONS preflight
curl -X OPTIONS "http://localhost:5173/api/limited-reveals/status" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test GET request
curl -X GET "http://localhost:5173/api/limited-reveals/status?post_id=test" \
  -H "Origin: https://example.com" \
  -v
```

Look for these headers in response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Browser Console Debugging

```javascript
// Check if userscript is loaded
console.log(window.GhostpostReveal ? 'Loaded' : 'Not loaded');

// Manually trigger scan
if (window.GhostpostReveal) {
  window.GhostpostReveal.scanPage();
}

// Check for CORS errors
// Open DevTools → Network → Look for red requests
// Check Console for CORS error messages
```

### Extension Debugging

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Inspect views: service worker" for background debugging
4. Right-click extension icon → "Inspect popup" for UI debugging
5. Check "Console" tab in DevTools on any page for content script logs

---

## Conclusion

GhostPost successfully works across different websites by:

1. **Minimizing cross-origin requests** - Most processing is local
2. **Using proper CORS headers** - API endpoints explicitly allow cross-origin access
3. **Leveraging browser mechanisms** - Userscripts and extensions have special privileges
4. **Prioritizing privacy** - No sensitive data is collected or transmitted
5. **Operating transparently** - Clear documentation and open-source code

The architecture is designed to be:
- **Secure** - Respects browser security boundaries
- **Private** - Minimal data collection, local processing
- **Performant** - WASM for fast decoding, minimal network calls
- **Universal** - Works on any website that preserves Unicode text

This approach enables users to detect and decode hidden messages anywhere on the web, while maintaining strong security and privacy guarantees.

---

## Related Documentation

- `CORS_FIX_SUMMARY.md` - Detailed CORS implementation for API endpoints
- `XCOM_API_BEHAVIOR.md` - Platform-specific behavior on Twitter/X
- `browser-extension/README.md` - Browser extension architecture
- `README.md` - General project documentation
- `SECURITY_SUMMARY.md` - Security analysis and best practices

---

## Questions or Issues?

For questions about cross-site functionality, security, or privacy:
- Open an issue on GitHub: https://github.com/rkendel1/ghostpost
- Review the source code (fully open-source)
- Check browser console for debugging info
