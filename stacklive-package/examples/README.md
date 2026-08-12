# StackLive Integration Examples

This directory contains working examples demonstrating how to integrate the GhostPost StackLive package into your application.

## 📋 Available Examples

### 1. basic-integration.html
**Full-featured demo with UI**

A complete, polished example showing all functionality:
- Encoding messages with tracking
- Decoding messages with auto-launch option
- Scanning text for hidden content
- Visual feedback and results display

**Run it:**
```bash
# From the stacklive-package directory
npx serve examples -p 3000
# Open http://localhost:3000/basic-integration.html
```

### 2. vanilla-js.html
**Minimal implementation**

The simplest possible integration:
- Basic encode/decode functionality
- Minimal HTML and CSS
- Perfect starting point for understanding the API

**Run it:**
```bash
npx serve examples -p 3000
# Open http://localhost:3000/vanilla-js.html
```

## 🚀 Quick Start Guide

### Method 1: Serve Locally

```bash
# Install serve (if not already installed)
npm install -g serve

# Navigate to examples directory
cd stacklive-package/examples

# Start server
serve -p 3000

# Open browser
open http://localhost:3000/basic-integration.html
```

### Method 2: Direct File Open

Some browsers support opening HTML files directly:

```bash
# Navigate to examples
cd stacklive-package/examples

# Open in default browser (macOS)
open basic-integration.html

# Or (Linux)
xdg-open basic-integration.html

# Or (Windows)
start basic-integration.html
```

**Note:** Direct file opening may have CORS issues with ES modules. Use a local server for best results.

## 📖 Understanding the Examples

### Basic Integration Flow

1. **Initialize the module**
   ```javascript
   import { initStackLive } from '../stacklive-integration.ts';
   await initStackLive();
   ```

2. **Encode a message**
   ```javascript
   import { encodeForStackLive } from '../stacklive-integration.ts';
   
   const result = await encodeForStackLive(
     "Public message",
     "Secret message",
     true // Enable tracking
   );
   
   console.log(result.encoded); // Post this anywhere
   console.log(result.experienceId); // Track with this
   ```

3. **Decode a message**
   ```javascript
   import { decodeForStackLive } from '../stacklive-integration.ts';
   
   const decoded = await decodeForStackLive(
     encodedText,
     false // Don't auto-launch
   );
   
   console.log(decoded.message); // The secret
   console.log(decoded.experienceId); // Tracking ID
   ```

4. **Scan for hidden content**
   ```javascript
   import { scanForExperiences } from '../stacklive-integration.ts';
   
   const detection = await scanForExperiences(text);
   
   if (detection?.detected) {
     console.log('Found hidden content!');
     console.log('Char count:', detection.charCount);
   }
   ```

## 🎯 Integration Patterns

### Pattern 1: Social Feed Scanner

Automatically scan posts for hidden content:

```javascript
// Monitor feed for new posts
const observer = new MutationObserver(async (mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.classList?.contains('post-content')) {
        const detection = await scanForExperiences(node.textContent);
        if (detection?.detected) {
          addRevealButton(node);
        }
      }
    }
  }
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

### Pattern 2: Chat Message Handler

Add hidden content support to chat:

```javascript
// When sending a message
async function sendMessage(text, secret = null) {
  let finalText = text;
  
  if (secret) {
    const encoded = await encodeForStackLive(text, secret, true);
    finalText = encoded.encoded;
  }
  
  // Send through your chat API
  await chatAPI.send(finalText);
}

// When receiving a message
async function onMessageReceived(message) {
  const detection = await scanForExperiences(message.text);
  
  if (detection?.detected) {
    // Show "reveal" option
    showRevealButton(message);
  }
}
```

### Pattern 3: Content Creation

Add encoding to your content editor:

```javascript
// In your post composer
class PostComposer {
  async createPost(publicText, secretText = null) {
    let content = publicText;
    let experienceId = null;
    
    if (secretText) {
      const encoded = await encodeForStackLive(
        publicText,
        secretText,
        true
      );
      content = encoded.encoded;
      experienceId = encoded.experienceId;
    }
    
    return {
      content,
      experienceId,
      metadata: {
        hasHiddenContent: !!secretText
      }
    };
  }
}
```

## 🔍 Testing Your Integration

### Test Checklist

- [ ] Can encode a simple message
- [ ] Can decode the encoded message
- [ ] Can scan and detect encoded messages
- [ ] Experience IDs are generated correctly
- [ ] Auto-launch works (if implemented)
- [ ] Event listeners work (if used)
- [ ] State machine updates (if used)
- [ ] Works in target browsers

### Common Issues

**Issue:** "Module not found" error
- **Solution:** Make sure to serve files with a local server, not open files directly
- ES modules require a server to resolve imports

**Issue:** WASM initialization fails
- **Solution:** Check browser console for errors
- Ensure WASM file is accessible at `../wasm/wasm_bg.wasm`
- Check browser supports WebAssembly

**Issue:** Decoding returns wrong message
- **Solution:** Make sure you're decoding the exact encoded text
- Invisible characters may be stripped by some text editors

**Issue:** Pattern detection doesn't work
- **Solution:** Ensure message was encoded with this package
- Check that invisible characters weren't stripped during copy/paste

## 🛠️ Customizing Examples

### Adding Your Own Branding

```javascript
// Modify the visual styles
document.documentElement.style.setProperty('--primary-color', '#your-color');
```

### Adding Analytics

```javascript
import { onExperienceDetected } from '../stacklive-integration.ts';

onExperienceDetected((event) => {
  // Send to your analytics
  analytics.track(event.type, {
    experienceId: event.experienceId,
    timestamp: Date.now()
  });
});
```

### Custom Error Handling

```javascript
try {
  const result = await encodeForStackLive(visible, secret);
} catch (error) {
  if (error.message.includes('WASM')) {
    showError('Failed to initialize encoding engine');
  } else {
    showError('Encoding failed: ' + error.message);
  }
}
```

## 📚 Next Steps

After trying these examples:

1. **Read the main README.md** for full API documentation
2. **Check INTEGRATION_GUIDE.md** for StackLive-specific integration
3. **Explore the overlay-runtime** for advanced pattern detection
4. **Review the web-components** for ready-made UI elements

## 💡 Tips

- Always call `initStackLive()` before using other functions
- Store the `experienceId` for analytics tracking
- Use scanning to detect before decoding (saves computation)
- Test with various message lengths and special characters
- Consider lazy-loading WASM for better performance

## 🤝 Contributing Examples

Have a useful integration pattern? Submit a PR with:
- New example HTML file
- Documentation in this README
- Test cases if applicable
- Screenshots of the working example

## 📄 License

MIT - Same as GhostPost project
