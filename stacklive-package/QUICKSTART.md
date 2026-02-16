# Quick Start Guide - StackLive Integration

Get up and running with the GhostPost StackLive integration in under 5 minutes.

## 🚀 Ultra-Quick Start (3 Steps)

### 1. Copy the Package

```bash
# From the ghostpost repository
cp -r stacklive-package /path/to/your/stacklive/project/modules/ghostpost
```

### 2. Import and Initialize

```typescript
// In your main app file
import { initStackLive, encodeForStackLive, decodeForStackLive } 
  from './modules/ghostpost/stacklive-integration.ts';

// Initialize once on app start
await initStackLive();
```

### 3. Start Using

```typescript
// Encode a message
const result = await encodeForStackLive(
  "This is the public message everyone sees",
  "This is the secret message only decoders see",
  true // Enable tracking
);

console.log(result.encoded); // Share this anywhere!
console.log(result.experienceId); // Use for tracking

// Decode a message
const decoded = await decodeForStackLive(result.encoded);
console.log(decoded.message); // "This is the secret message..."
```

## ✅ That's It!

You now have hidden message encoding/decoding in your StackLive app.

## 📖 What's Next?

### Option 1: Try the Examples

```bash
cd stacklive-package/examples
npx serve -p 3000
# Open http://localhost:3000/basic-integration.html
```

### Option 2: Add Auto-Detection

```html
<!-- In your HTML -->
<script type="module" src="/modules/ghostpost/web-components/stacklive-overlay.ts"></script>

<stacklive-overlay 
  position="bottom-right"
  auto-scan="true"
  theme="dark">
</stacklive-overlay>
```

Now you have a floating button that automatically detects hidden messages on any page!

### Option 3: Scan Content

```typescript
import { scanForExperiences } from './modules/ghostpost/stacklive-integration.ts';

// Check if content has hidden messages
const userPost = getUserPost();
const detection = await scanForExperiences(userPost.content);

if (detection?.detected) {
  console.log('This post has a hidden message!');
  // Show a reveal button or auto-decode
}
```

## 🎯 Common Use Cases

### Social Feed Scanner

```typescript
// Automatically scan all posts in feed
document.querySelectorAll('.post-content').forEach(async (post) => {
  const detection = await scanForExperiences(post.textContent);
  if (detection?.detected) {
    addRevealButton(post);
  }
});
```

### Content Composer

```typescript
// Let users add secret messages to posts
async function createPost() {
  const publicText = document.getElementById('publicText').value;
  const secretText = document.getElementById('secretText').value;
  
  const encoded = await encodeForStackLive(publicText, secretText, true);
  
  // Post to your platform
  await stacklive.posts.create({
    content: encoded.encoded,
    experienceId: encoded.experienceId
  });
}
```

### Message Decoder

```typescript
// Reveal hidden content
async function revealSecret(encodedText) {
  try {
    const decoded = await decodeForStackLive(encodedText);
    
    // Show in a modal
    showModal({
      title: '🎉 Secret Revealed!',
      message: decoded.message,
      experienceId: decoded.experienceId
    });
  } catch (error) {
    console.error('No hidden content found');
  }
}
```

## 🔧 Configuration

### Custom Delimiters

Edit `stacklive-integration.ts`:

```typescript
const STACKLIVE_DELIMITER = '||yourapp:';
```

### Overlay Position

```html
<stacklive-overlay position="top-left"></stacklive-overlay>
<!-- or: top-right, bottom-left, bottom-right -->
```

### Scan Frequency

```html
<stacklive-overlay scan-interval="5000"></stacklive-overlay>
<!-- 5 seconds between scans -->
```

## 📚 Learn More

- **Full Documentation**: [README.md](./README.md)
- **Integration Guide**: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Examples**: [examples/README.md](./examples/README.md)
- **Package Summary**: [SUMMARY.md](./SUMMARY.md)

## 💡 Tips

1. **Always initialize first**: Call `initStackLive()` before other functions
2. **Use scanning**: Check for content before decoding to avoid errors
3. **Track events**: Use `onExperienceDetected()` for analytics
4. **Handle errors**: Wrap decode calls in try-catch
5. **Test locally**: Use the examples to verify integration

## 🆘 Troubleshooting

**WASM won't load?**
- Check that `wasm/wasm_bg.wasm` file exists
- Ensure server sends correct MIME type (`application/wasm`)
- Check browser console for errors

**Detection not working?**
- Verify `initStackLive()` was called
- Make sure invisible characters weren't stripped during copy/paste
- Test with example encoded messages first

**Events not firing?**
- Register listeners before encoding/decoding
- Check that `stackliveAdapter` initialized successfully

## 🎉 Success Checklist

- [ ] Package copied to project
- [ ] Import statement added
- [ ] `initStackLive()` called on startup
- [ ] Can encode a test message
- [ ] Can decode the test message
- [ ] Scanning works correctly
- [ ] Examples run successfully
- [ ] Ready for production!

---

**Need help?** Check the detailed docs or review the working examples in the `examples/` directory.

**Ready to deploy?** See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for production setup.
