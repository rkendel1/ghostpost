# X.com (Twitter) API Behavior and Detection Guide

## Overview

This document explains how X.com (Twitter) handles Ghostpost encoded messages in their API and provides guidance for detecting hidden content.

## How X.com Handles Encoded Messages

### The tweet_text Field

When someone posts on X.com with an encoded message like:

```
"testi‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍ng123"
```

The **entire text including all invisible Unicode characters** is preserved in X.com's backend and API responses.

### API Example

**Request to X.com GraphQL API:**
```
POST https://x.com/i/api/graphql/TAJw1rBsjAtdNgTdlo2oeg/CreateTweet

Payload:
{
  "variables": {
    "tweet_text": "testi‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍ng123"
  }
}
```

**Response:**
```json
{
  "data": {
    "create_tweet": {
      "tweet_results": {
        "result": {
          "legacy": {
            "full_text": "testi‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍‍ng123"
          }
        }
      }
    }
  }
}
```

### Key Facts

✅ **Nothing is truncated** — Twitter's GraphQL `tweet_text` field supports extended Unicode.

✅ **The hidden content is fully delivered** to the backend as part of the text.

✅ **The frontend visually collapses** invisible characters when rendering, making them appear hidden.

✅ **Any extension, scraper, or LLM** can read the entire hidden payload by simply parsing the `tweet_text` string.

## Security Implications

### What This Means

The invisible characters used by Ghostpost are **technically visible** to anyone who:
- Accesses the tweet data via X.com's API
- Uses browser developer tools to inspect the DOM
- Copies and pastes the tweet text
- Uses browser extensions or scrapers

### The "Hidden" Part

The content appears "hidden" because:
1. **Visual rendering** - X.com's frontend CSS collapses zero-width characters
2. **User perception** - Most users don't see invisible Unicode characters
3. **Default behavior** - Standard tweet viewing doesn't reveal the encoded data

### Not a Bug, By Design

This is **intentional behavior** and part of Ghostpost's design:
- Ghostpost uses Unicode steganography (hiding data in plain sight)
- The encoding is meant to be **selectively revealed**, not cryptographically secure
- Anyone with the right tools CAN detect and decode the message
- The "security" comes from obscurity and selective sharing, not encryption

## How to Detect Hidden Content on X.com

### For Browser Extensions

A browser extension can detect Ghostpost content by:

1. **Reading tweet_text** from the page or API responses
2. **Searching for zero-width characters** in these categories:
   - `\u200B` - Zero Width Space
   - `\u200C` - Zero Width Non-Joiner
   - `\u200D` - Zero Width Joiner
   - `\u200E` - Left-to-Right Mark
   - `\u200F` - Right-to-Left Mark
   - `\u202C` - Pop Directional Formatting
   - `\u202D` - Left-to-Right Override
   - `\u2060` - Word Joiner
   - `\uFEFF` - Zero Width No-Break Space (delimiter)

3. **Validating the format**:
   ```javascript
   function hasGhostpostContent(text) {
     // Look for delimiter characters
     const delimiterChar = '\uFEFF';
     const firstDelim = text.indexOf(delimiterChar);
     const secondDelim = text.indexOf(delimiterChar, firstDelim + 1);
     
     // Need at least 2 delimiters for valid encoding
     return firstDelim !== -1 && secondDelim !== -1;
   }
   ```

### Detection Algorithm

```javascript
// Step 1: Scan text for invisible characters
const invisibleCharRegex = /[\u200B\u200C\u200D\u200E\u200F\u202C\u202D\u2060\uFEFF]/g;
const matches = text.match(invisibleCharRegex);

// Step 2: Check if enough characters present
if (matches && matches.length >= 8) {
  // Likely contains encoded content
  
  // Step 3: Validate delimiter structure
  if (hasCompleteDelimiters(text)) {
    // Valid Ghostpost encoding found
    return true;
  }
}

function hasCompleteDelimiters(text) {
  const delimiterChar = '\uFEFF';
  let count = 0;
  let index = text.indexOf(delimiterChar);
  
  while (index !== -1) {
    count++;
    if (count >= 2) return true;
    index = text.indexOf(delimiterChar, index + 1);
  }
  
  return false;
}
```

## Implementation in Ghostpost

### Current Approach

Ghostpost's browser extension and userscript use the **correct approach** for X.com:

1. **Scan DOM text nodes** for invisible Unicode characters
2. **Walk up parent elements** to aggregate complete messages (X.com splits text across nodes)
3. **Validate delimiter structure** to ensure complete encoding
4. **Extract and decode** the hidden content locally

### Why This Works

Using the `tweet_text` field (or aggregated DOM text) is the **correct and only approach** because:

- **Complete data** - Contains all invisible characters without truncation
- **Universal access** - Available via DOM, API, and copy/paste
- **Platform support** - X.com fully supports extended Unicode in tweets
- **Reliable** - Consistent across different viewing methods

### Code Reference

**Userscript**: `/static/ghostpost-reveal.user.js`
```javascript
const twitterAdapter = {
  extractText: (node) => {
    // Try text node first
    const nodeText = node.data || node.nodeValue || '';
    if (hasCompleteEncodedMessage(nodeText)) {
      return nodeText;
    }
    
    // Walk up DOM tree to aggregate text (handles X.com's split nodes)
    // ... (see full implementation in file)
  }
};
```

**Browser Extension**: `/browser-extension/scripts/content.js`
```javascript
function extractCompleteText(node) {
  // First try the text node itself
  const nodeText = node.data || node.nodeValue || '';
  if (hasCompleteEncodedMessage(nodeText)) {
    return nodeText;
  }
  
  // Walk up DOM to aggregate (handles X.com's nested structure)
  // ... (see full implementation in file)
}
```

## Best Practices

### For Detection

1. **Check DOM first** - Faster than API calls
2. **Validate structure** - Ensure delimiters are present
3. **Aggregate parent text** - X.com splits text across multiple nodes
4. **Check up to 10 levels** - X.com's nested structure can be deep

### For Encoding

1. **Test locally first** - Verify encoding before posting
2. **Keep messages short** - Shorter is more reliable
3. **Use copy/paste** - Manual posting ensures content is preserved
4. **Verify after posting** - Check that invisible characters survived

### For Privacy

1. **Understand limitations** - Content is not encrypted, just obfuscated
2. **Use selectively** - Share decode link only with intended recipients
3. **Consider sensitivity** - Don't use for truly confidential information
4. **Layer security** - Combine with other privacy measures if needed

## FAQ

### Q: Can X.com remove invisible characters?

**A:** Technically yes, but they currently don't. X.com's backend and API preserve extended Unicode characters, including zero-width characters.

### Q: Is this a security vulnerability?

**A:** No. Ghostpost is designed as Unicode steganography, not encryption. The content is intentionally "hidden in plain sight" and can be detected by those who know what to look for.

### Q: Will my hidden message be visible to everyone?

**A:** The message appears as normal text to most users. Only those with:
- Ghostpost browser extension
- Ghostpost userscript
- Technical knowledge to inspect the text
...can detect and decode the hidden content.

### Q: What if X.com changes their API?

**A:** If X.com starts stripping invisible characters, Ghostpost will need to adapt. However, this is unlikely as many legitimate uses (RTL text, formatting) rely on these characters.

### Q: How is this different from encryption?

**A:** 
- **Encryption**: Mathematically transforms data to be unreadable without a key
- **Ghostpost**: Hides data using invisible characters (steganography + obfuscation)
- Ghostpost is easier to detect if someone knows what to look for
- Use encryption for truly sensitive data

## Related Documentation

- `XCOM_REVEAL_SOLUTION.md` - Technical details on reveal implementation
- `XCOM_DECODING_FIX.md` - Fix for X.com decoding issues
- `XCOM_FIX_SUMMARY.md` - Summary of X.com-specific fixes
- `/static/ghostpost-reveal.user.js` - Userscript implementation
- `/browser-extension/scripts/content.js` - Extension implementation

## Conclusion

X.com's API behavior is **compatible with Ghostpost** and the current implementation approach is **correct**. The `tweet_text` field preserves all invisible Unicode characters, making detection and decoding possible through DOM scanning and text aggregation.

The key to successful detection on X.com is:
1. **Scanning for zero-width characters**
2. **Validating delimiter structure**
3. **Aggregating text from parent elements**
4. **Understanding that "hidden" means visually obscured, not cryptographically secure**

This approach has been tested and validated in:
- Ghostpost Reveal userscript (v2.3.8+)
- Ghostpost browser extension (v1.2.1+)
- Multiple test scenarios and real-world usage

## Version History

- **2025-12-12**: Initial documentation created to clarify X.com API behavior and detection approach
