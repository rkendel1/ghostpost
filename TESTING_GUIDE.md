# Ghostpost Decoding Fix - Testing & Verification Guide

## Quick Start

The userscript has been updated from v2.2.0 to v2.2.1 to fix garbled character decoding issues.

### What Changed
- **Problem:** `pako.inflate()` was being used (expects zlib format)
- **Solution:** Changed to `pako.inflateRaw()` (handles raw DEFLATE)
- **Result:** Messages now decode correctly instead of showing garbled text

## Testing the Fix

### Option 1: Automated Browser Test

1. **Open the test page:**
   ```
   https://your-deployment-url/test-pako-fix.html
   ```

2. **Run the tests:**
   - Click "Run Test" under each section
   - All tests should show green checkmarks (✅)
   
3. **Expected results:**
   - Test 1: `pako.inflate()` fails with "incorrect header check" ✅
   - Test 2: `pako.inflateRaw()` succeeds with correct text ✅
   - Test 3: Without decompression shows garbled text ✅

### Option 2: Manual Testing with Real Messages

#### Step 1: Create a Test Message
1. Go to the Compose page: `https://your-deployment-url/compose`
2. Enter visible message: "Test message"
3. Enter secret: "This is a secret"
4. Click "Encode" and copy the result

#### Step 2: Test Decoding
1. Open a new page or social media post
2. Paste the encoded message
3. The ghost button (👻) should appear with a red badge showing "1"
4. Click the ghost button
5. Click "Reveal" on the message

#### Step 3: Verify Results
**✅ SUCCESS if you see:** "This is a secret"  
**❌ FAILURE if you see:** Garbled characters like `s��!�Rp�}...`

### Option 3: Console Testing (Developer Tools)

Open browser console and paste this test:

```javascript
// Test the fix
(async function testPakoFix() {
    // Load pako if not already loaded
    if (typeof pako === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
    }

    console.log('%cTesting Pako Fix', 'font-size: 20px; font-weight: bold; color: #667eea');
    
    const testString = "Hello, Ghostpost!";
    console.log('Original:', testString);
    
    // Simulate Rust encoding (compress with raw DEFLATE)
    const compressed = pako.deflateRaw(new TextEncoder().encode(testString));
    console.log('Compressed:', compressed.length, 'bytes');
    
    // Test wrong method (the bug)
    try {
        pako.inflate(compressed);
        console.log('%c❌ pako.inflate() should have failed!', 'color: red');
    } catch (e) {
        console.log('%c✅ pako.inflate() failed correctly:', 'color: green', e.message);
    }
    
    // Test correct method (the fix)
    try {
        const decompressed = pako.inflateRaw(compressed);
        const decoded = new TextDecoder().decode(decompressed);
        if (decoded === testString) {
            console.log('%c✅ pako.inflateRaw() WORKS PERFECTLY!', 'color: green; font-weight: bold');
            console.log('Decoded:', decoded);
        } else {
            console.log('%c❌ Mismatch!', 'color: red');
        }
    } catch (e) {
        console.log('%c❌ pako.inflateRaw() failed:', 'color: red', e.message);
    }
    
    // Show the bug
    const garbled = new TextDecoder('utf-8', {fatal: false}).decode(compressed);
    console.log('%cWithout decompression (the bug):', 'color: orange', garbled);
})();
```

**Expected output:**
```
Testing Pako Fix
Original: Hello, Ghostpost!
Compressed: 19 bytes
✅ pako.inflate() failed correctly: incorrect header check
✅ pako.inflateRaw() WORKS PERFECTLY!
Decoded: Hello, Ghostpost!
Without decompression (the bug): �H����/,.�/..Q�
```

## Troubleshooting

### Issue: Userscript not updating

**Solution:**
1. Open userscript manager (Tampermonkey/Greasemonkey/etc.)
2. Find "Ghostpost Reveal"
3. Click "Check for updates" or manually update
4. Verify version shows 2.2.1

### Issue: Still seeing garbled text

**Check:**
1. Verify userscript version is 2.2.1 (check console or script manager)
2. Clear browser cache and reload
3. Check console for errors:
   ```javascript
   console.log('Pako available:', typeof pako !== 'undefined');
   console.log('inflateRaw available:', typeof pako?.inflateRaw === 'function');
   ```

### Issue: "Pako library not available" warning

**Solution:**
1. Check network: Pako loads from CDN
2. Verify CDN is accessible:
   ```
   https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js
   ```
3. Check browser console for CSP (Content Security Policy) errors
4. If blocked, messages will fall back to uncompressed (legacy format)

## Technical Verification

### Verify the Fix in Code

Check the userscript code contains:
```javascript
// ✅ CORRECT (v2.2.1)
if (typeof pako !== 'undefined' && typeof pako.inflateRaw === 'function') {
    finalBytes = pako.inflateRaw(decodedBytes);
```

NOT:
```javascript
// ❌ WRONG (v2.2.0)
if (typeof pako !== 'undefined' && pako.inflate) {
    finalBytes = pako.inflate(decodedBytes);
```

### Verify Version

In browser console:
```javascript
// Check version
document.querySelector('#ghostpost-reveal-button')?.dataset?.version
// Should return: "2.2.1"
```

### Check Compression Format

To verify messages are using raw DEFLATE:

```javascript
// In Node.js or browser with pako
const testSecret = "Test";
const compressed = pako.deflateRaw(new TextEncoder().encode(testSecret));

// These should match Rust output
console.log('Hex:', Array.from(compressed).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Try both methods
try { 
    pako.inflate(compressed); 
    console.log('inflate: ❌ Should have failed'); 
} catch { 
    console.log('inflate: ✅ Failed as expected'); 
}

try { 
    const result = pako.inflateRaw(compressed); 
    console.log('inflateRaw: ✅', new TextDecoder().decode(result)); 
} catch { 
    console.log('inflateRaw: ❌ Failed unexpectedly'); 
}
```

## Integration Testing

### Test with Multiple Platforms

Test the userscript on various platforms:
- [ ] Twitter/X posts
- [ ] Facebook posts
- [ ] LinkedIn updates
- [ ] Reddit comments
- [ ] Plain HTML pages
- [ ] GitHub issues/comments
- [ ] Any other social media

### Test Scenarios

1. **New Message (Compressed)**
   - Create fresh encoded message
   - Should decode correctly with pako.inflateRaw()

2. **Legacy Message (Uncompressed)**
   - Use old message created before compression
   - Should still work via fallback

3. **Image Hidden Content**
   - Encode an image
   - Should decode and display image correctly

4. **Long Messages**
   - Test with 500+ character secrets
   - Verify no truncation or corruption

5. **Special Characters**
   - Test with emojis: "Secret 😊🎉"
   - Test with Unicode: "Тест Δοκιμή テスト"
   - Test with symbols: "Test!@#$%^&*()"

## Regression Testing

Ensure these features still work:

- [ ] Ghost button appears on pages
- [ ] Counter badge shows correct count
- [ ] Modal opens above ghost button
- [ ] Inline reveal works in modal
- [ ] Copy to clipboard works
- [ ] Find/locate button scrolls to element
- [ ] Multiple messages can be revealed
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Works on mobile browsers

## Performance Testing

Verify no performance degradation:

```javascript
// Measure decode time
console.time('decode');
// ... decode operation ...
console.timeEnd('decode');
// Should be < 10ms for typical messages
```

## Security Verification

Confirm no new vulnerabilities:
- [ ] CodeQL scan: 0 alerts
- [ ] No eval() or dangerous functions
- [ ] Proper HTML escaping
- [ ] XSS protection maintained
- [ ] CSP compatibility

## Success Criteria

✅ **Fix is successful if:**
1. Decoded messages show correct readable text
2. No garbled characters appear
3. Legacy uncompressed messages still work
4. All tests pass (automated and manual)
5. No new bugs introduced
6. Performance is acceptable
7. Security scan passes

## Rollback Plan

If issues occur:

1. **Immediate rollback:**
   ```javascript
   // In userscript, change back to:
   finalBytes = pako.inflate(decodedBytes);
   // Version: 2.2.0
   ```

2. **Alternative fix:**
   - Disable compression in Rust encoder
   - Remove pako dependency
   - Use uncompressed format only

3. **Contact:**
   - Report issues in GitHub repo
   - Provide console logs
   - Include example encoded message

## Documentation

- **Technical Details:** See `PAKO_FIX_SUMMARY.md`
- **Test Page:** Open `static/test-pako-fix.html`
- **Code Changes:** Check Git diff for v2.2.0 to v2.2.1

## Support

If you encounter issues:
1. Check this guide first
2. Run the console test above
3. Check browser console for errors
4. Verify version is 2.2.1
5. Report with detailed steps to reproduce

---

**Version:** 2.2.1  
**Date:** 2025-12-11  
**Status:** ✅ Ready for production deployment
