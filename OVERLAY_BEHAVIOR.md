# Ghostpost Overlay Behavior

## Overview

The Ghostpost Reveal overlay (userscript) provides a consistent experience across **ALL websites**, including the Ghostpost landing page, Reddit, Twitter/X, and any other site.

## Three-Step Process

### 1. 👻 Notify

When hidden messages are detected on a page:
- The floating ghost button appears in the bottom-right corner
- A **red badge** shows the count of detected messages
- The button **pulses red** to draw attention
- No authentication required

### 2. 🔍 Identify

When you click the ghost button:
- A **modal opens above the button** (not a redirect!)
- Lists **all detected hidden messages** with:
  - Location (element type and ID/class)
  - Visible text preview
  - Two action buttons per message:
    - **🔓 Reveal** - Decode the secret inline
    - **📍 Find** - Scroll to and highlight the message on the page

### 3. ✨ Reveal

When you click "Reveal" on a message:
- Decoding happens **client-side** (no server request)
- The decoded secret appears **inline** in the modal (no page navigation)
- For text secrets: Shows the decoded message with a "Copy Secret" button
- For image secrets: Displays the hidden image
- **No authentication required** - all processing is local

## Key Features

### Universal Behavior
- ✅ Same behavior on Ghostpost site and external sites (Reddit, Twitter, etc.)
- ✅ No redirects to decode pages
- ✅ No authentication required
- ✅ All decoding happens locally in your browser

### Security & Privacy
- All scanning and decoding happens in your browser
- No data sent to external servers
- No tracking or analytics
- Excluded from sensitive domains (banking, login pages)

### Performance
- Debounced scanning (2 seconds after page changes)
- Scan timeouts to prevent browser freezing
- Node limits for large pages
- Quick pre-checks before expensive regex matching
- Micro-pulsing animation on social media sites

## Version History

### v2.0.0 (Current)
- ✅ **Inline decoding** - No more redirects to decode page
- ✅ **Compact modal** - Positioned above ghost button
- ✅ **Client-side only** - No authentication needed
- ✅ **Copy to clipboard** - Easy sharing of revealed secrets

### v1.x (Legacy - Deprecated)
- ❌ Used to redirect to `/decode` page
- ❌ Required navigation away from current page
- ❌ Less user-friendly workflow

## Implementation

The overlay is implemented as a userscript in `/static/ghostpost-reveal.user.js`:

- **Detection**: Scans for invisible Unicode characters used in Ghostpost encoding
- **Modal**: Creates DOM elements dynamically for the reveal interface
- **Decoding**: Uses a Base64 character map to decode hidden messages locally
- **No external dependencies**: Pure JavaScript, no frameworks

## Testing

Test pages available:
- `/demo` - Interactive demo with sample hidden messages
- `/static/test-reveal.html` - Standalone test page

## Installation

Users can install the overlay by:
1. Installing a userscript manager (Tampermonkey, Violentmonkey, Greasemonkey)
2. Visiting `/install` on the Ghostpost website
3. Clicking "Install Reveal Button"

The overlay is also automatically loaded on the Ghostpost landing page for demonstration purposes.
