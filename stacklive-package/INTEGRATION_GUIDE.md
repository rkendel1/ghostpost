# StackLive Integration Guide

This guide provides step-by-step instructions for integrating the GhostPost package into the StackLive platform.

## 🎯 Integration Overview

The GhostPost StackLive package provides:
- **WASM Engine**: High-performance encoding/decoding
- **Pattern Detection**: Automatic discovery of hidden content
- **Overlay Runtime**: State machine and event system
- **Web Components**: Ready-to-use UI elements
- **Userscript**: Browser extension alternative

## 📋 Prerequisites

Before integrating:
- StackLive platform running (development or production)
- Node.js 18+ installed
- Modern browser with WebAssembly support
- Basic understanding of JavaScript/TypeScript

## 🚀 Step-by-Step Integration

### Step 1: Copy Package Files

Copy the entire `stacklive-package` directory into your StackLive modules:

```bash
# From the ghostpost repository root
cp -r stacklive-package /path/to/stacklive/modules/ghostpost

# Verify files were copied
ls -la /path/to/stacklive/modules/ghostpost
```

Expected structure:
```
stacklive/
└── modules/
    └── ghostpost/
        ├── wasm/
        ├── overlay-runtime/
        ├── userscript/
        ├── web-components/
        ├── examples/
        ├── stacklive-integration.ts
        ├── package.json
        └── README.md
```

### Step 2: Import the Integration Module

In your StackLive application entry point:

```typescript
// src/app.ts or main.ts
import { 
  initStackLive,
  encodeForStackLive,
  decodeForStackLive,
  scanForExperiences,
  onExperienceDetected
} from './modules/ghostpost/stacklive-integration.ts';

// Initialize on app start
async function initApp() {
  // Initialize GhostPost
  await initStackLive();
  console.log('GhostPost integration ready');
  
  // Your other initialization code...
}

initApp();
```

### Step 3: Add Content Scanning

Scan user-generated content for hidden messages:

```typescript
// In your content rendering module
import { scanForExperiences } from './modules/ghostpost/stacklive-integration.ts';

async function renderPost(post) {
  // Render the post content
  const element = createPostElement(post);
  
  // Scan for hidden content
  const detection = await scanForExperiences(post.content);
  
  if (detection?.detected) {
    // Add reveal button
    addRevealButton(element, post.content);
  }
  
  return element;
}

function addRevealButton(element, encodedContent) {
  const button = document.createElement('button');
  button.textContent = '👻 Reveal Secret';
  button.className = 'reveal-button';
  button.onclick = async () => {
    const decoded = await decodeForStackLive(encodedContent, false);
    showSecretModal(decoded.message, decoded.experienceId);
  };
  
  element.appendChild(button);
}
```

### Step 4: Add Encoding to Content Creation

Allow users to create hidden messages:

```typescript
// In your post composer
import { encodeForStackLive } from './modules/ghostpost/stacklive-integration.ts';

async function createPost(publicText, secretText = null) {
  let content = publicText;
  let metadata = {};
  
  // If user added a secret message
  if (secretText && secretText.trim()) {
    const encoded = await encodeForStackLive(
      publicText,
      secretText,
      true // Enable tracking
    );
    
    content = encoded.encoded;
    metadata.experienceId = encoded.experienceId;
    metadata.hasHiddenContent = true;
  }
  
  // Create post in StackLive
  return await stacklive.posts.create({
    content,
    metadata
  });
}
```

### Step 5: Add Overlay Component (Optional)

Include the automatic detection overlay:

```html
<!-- In your main layout template -->
<script type="module" src="/modules/ghostpost/web-components/stacklive-overlay.ts"></script>

<stacklive-overlay 
  position="bottom-right"
  auto-scan="true"
  theme="dark"
  scan-interval="3000">
</stacklive-overlay>
```

### Step 6: Add Event Tracking

Track when users reveal hidden content:

```typescript
import { onExperienceDetected } from './modules/ghostpost/stacklive-integration.ts';

// Set up event listener
onExperienceDetected((event) => {
  switch (event.type) {
    case 'PATTERN_DETECTED':
      // Hidden content was found
      stacklive.analytics.track('hidden_content_detected', {
        timestamp: Date.now()
      });
      break;
      
    case 'EXPERIENCE_RESOLVED':
      // Experience ID was extracted
      stacklive.analytics.track('experience_resolved', {
        experienceId: event.experienceId,
        timestamp: Date.now()
      });
      break;
      
    case 'RUNTIME_LAUNCHED':
      // User revealed the secret
      stacklive.analytics.track('secret_revealed', {
        experienceId: event.experienceId,
        timestamp: Date.now()
      });
      break;
  }
});
```

## 🎨 UI Integration Examples

### Example 1: Social Feed

```typescript
// Scan feed posts for hidden content
class FeedRenderer {
  async renderFeed(posts) {
    const renderedPosts = [];
    
    for (const post of posts) {
      const element = await this.renderPost(post);
      renderedPosts.push(element);
    }
    
    return renderedPosts;
  }
  
  async renderPost(post) {
    const container = document.createElement('div');
    container.className = 'feed-post';
    
    // Post content
    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = post.content;
    container.appendChild(content);
    
    // Check for hidden content
    const detection = await scanForExperiences(post.content);
    if (detection?.detected) {
      const revealBtn = this.createRevealButton(post.content);
      container.appendChild(revealBtn);
    }
    
    return container;
  }
  
  createRevealButton(encodedContent) {
    const button = document.createElement('button');
    button.className = 'btn-reveal';
    button.innerHTML = '👻 Secret Message Available';
    
    button.onclick = async () => {
      try {
        const decoded = await decodeForStackLive(encodedContent, false);
        this.showSecretModal(decoded);
      } catch (error) {
        console.error('Failed to reveal:', error);
      }
    };
    
    return button;
  }
  
  showSecretModal(decoded) {
    // Show modal with secret content
    stacklive.modal.show({
      title: '🎉 Secret Revealed!',
      content: decoded.message,
      footer: decoded.experienceId ? `Experience ID: ${decoded.experienceId}` : ''
    });
  }
}
```

### Example 2: Post Composer

```typescript
// Add secret message field to post composer
class PostComposer {
  constructor() {
    this.hasSecret = false;
  }
  
  render() {
    return `
      <div class="post-composer">
        <textarea id="publicMessage" 
          placeholder="What's on your mind?"></textarea>
        
        <button id="toggleSecret" onclick="this.toggleSecretField()">
          ➕ Add Secret Message
        </button>
        
        <div id="secretField" style="display: none;">
          <textarea id="secretMessage" 
            placeholder="Hidden message (only visible to those who reveal it)"></textarea>
        </div>
        
        <button id="postBtn" onclick="this.submitPost()">
          Post
        </button>
      </div>
    `;
  }
  
  toggleSecretField() {
    const field = document.getElementById('secretField');
    this.hasSecret = !this.hasSecret;
    field.style.display = this.hasSecret ? 'block' : 'none';
  }
  
  async submitPost() {
    const publicText = document.getElementById('publicMessage').value;
    const secretText = this.hasSecret 
      ? document.getElementById('secretMessage').value 
      : null;
    
    if (!publicText.trim()) {
      alert('Please enter a message');
      return;
    }
    
    let content = publicText;
    let experienceId = null;
    
    if (secretText && secretText.trim()) {
      const encoded = await encodeForStackLive(publicText, secretText, true);
      content = encoded.encoded;
      experienceId = encoded.experienceId;
    }
    
    // Submit to StackLive
    await stacklive.posts.create({
      content,
      metadata: {
        hasHiddenContent: !!experienceId,
        experienceId
      }
    });
    
    // Clear form
    this.clearForm();
  }
}
```

### Example 3: Message List with Auto-Detection

```typescript
// Auto-detect hidden content in message list
class MessageList {
  constructor() {
    this.messages = [];
    this.setupMutationObserver();
  }
  
  setupMutationObserver() {
    const observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.classList?.contains('message')) {
            await this.scanMessage(node);
          }
        }
      }
    });
    
    observer.observe(document.getElementById('messageList'), {
      childList: true,
      subtree: true
    });
  }
  
  async scanMessage(messageElement) {
    const text = messageElement.textContent;
    const detection = await scanForExperiences(text);
    
    if (detection?.detected) {
      this.addRevealIndicator(messageElement, text);
    }
  }
  
  addRevealIndicator(element, encodedText) {
    const indicator = document.createElement('div');
    indicator.className = 'secret-indicator';
    indicator.innerHTML = '👻';
    indicator.title = 'This message contains hidden content';
    
    indicator.onclick = async () => {
      const decoded = await decodeForStackLive(encodedText, false);
      this.showInlineSecret(element, decoded);
    };
    
    element.appendChild(indicator);
  }
  
  showInlineSecret(element, decoded) {
    const secretDiv = document.createElement('div');
    secretDiv.className = 'revealed-secret';
    secretDiv.textContent = decoded.message;
    element.appendChild(secretDiv);
  }
}
```

## 🎨 Styling the Integration

Add custom styles to match StackLive branding:

```css
/* Reveal button */
.btn-reveal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 10px;
}

.btn-reveal:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Secret indicator */
.secret-indicator {
  display: inline-block;
  cursor: pointer;
  font-size: 20px;
  margin-left: 8px;
  transition: transform 0.2s;
}

.secret-indicator:hover {
  transform: scale(1.2);
}

/* Revealed secret */
.revealed-secret {
  background: #f0f9ff;
  border-left: 4px solid #667eea;
  padding: 12px;
  margin-top: 10px;
  border-radius: 6px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## ⚙️ Configuration Options

### Delimiter Customization

If you need to use custom delimiters:

```typescript
// In stacklive-integration.ts
const STACKLIVE_DELIMITER = '||yourapp:';
const DELIMITER_END = '||';
```

### Scan Interval Adjustment

Adjust auto-scan frequency:

```html
<!-- Faster scanning (every 1 second) -->
<stacklive-overlay scan-interval="1000"></stacklive-overlay>

<!-- Slower scanning (every 5 seconds) -->
<stacklive-overlay scan-interval="5000"></stacklive-overlay>
```

### Theme Customization

Match StackLive's color scheme:

```html
<stacklive-overlay theme="light"></stacklive-overlay>
<!-- or -->
<stacklive-overlay theme="dark"></stacklive-overlay>
```

## 🧪 Testing the Integration

### 1. Test Encoding/Decoding

```javascript
// Quick test in browser console
import { encodeForStackLive, decodeForStackLive } from './modules/ghostpost/stacklive-integration.ts';

const encoded = await encodeForStackLive("Hello", "Secret!");
console.log('Encoded:', encoded.encoded);

const decoded = await decodeForStackLive(encoded.encoded);
console.log('Decoded:', decoded.message); // Should be "Secret!"
```

### 2. Test Pattern Detection

```javascript
import { scanForExperiences } from './modules/ghostpost/stacklive-integration.ts';

// Should detect
const detection1 = await scanForExperiences(encodedMessage);
console.log('Detected:', detection1?.detected); // true

// Should not detect
const detection2 = await scanForExperiences("Regular text");
console.log('Detected:', detection2?.detected); // false
```

### 3. Test Events

```javascript
import { onExperienceDetected } from './modules/ghostpost/stacklive-integration.ts';

onExperienceDetected((event) => {
  console.log('Event:', event.type, event);
});

// Trigger by encoding/decoding messages
```

## 📊 Analytics Integration

Track usage metrics:

```typescript
import { onExperienceDetected } from './modules/ghostpost/stacklive-integration.ts';

// Track all GhostPost events
onExperienceDetected((event) => {
  stacklive.analytics.track('ghostpost_event', {
    eventType: event.type,
    experienceId: event.experienceId,
    timestamp: Date.now(),
    userId: stacklive.currentUser?.id
  });
});

// Track specific metrics
async function trackSecretCreation(experienceId) {
  await stacklive.analytics.track('secret_created', {
    experienceId,
    timestamp: Date.now()
  });
}

async function trackSecretRevealed(experienceId) {
  await stacklive.analytics.track('secret_revealed', {
    experienceId,
    timestamp: Date.now()
  });
}
```

## 🔒 Security Considerations

1. **Input Validation**: Always validate user input before encoding
2. **Content Moderation**: Hidden content should go through same moderation as public content
3. **Rate Limiting**: Limit encoding operations to prevent abuse
4. **Size Limits**: Enforce maximum sizes for hidden content

```typescript
// Example security checks
async function secureEncode(publicText, secretText) {
  // Validate inputs
  if (publicText.length > 5000) {
    throw new Error('Public text too long');
  }
  if (secretText.length > 2000) {
    throw new Error('Secret text too long');
  }
  
  // Content moderation
  if (await containsInappropriateContent(publicText) || 
      await containsInappropriateContent(secretText)) {
    throw new Error('Content violates community guidelines');
  }
  
  // Rate limiting
  if (await isRateLimited(userId)) {
    throw new Error('Rate limit exceeded');
  }
  
  // Encode
  return await encodeForStackLive(publicText, secretText, true);
}
```

## 🚀 Deployment

### Production Checklist

- [ ] WASM files are properly served (correct MIME type)
- [ ] ES modules are bundled/transpiled if needed
- [ ] Event tracking is set up
- [ ] Analytics integration is working
- [ ] Content moderation is in place
- [ ] Rate limiting is configured
- [ ] Error logging is set up
- [ ] Browser compatibility is tested

### Build Process

If using a bundler:

```javascript
// vite.config.js or webpack.config.js
export default {
  // ... other config
  optimizeDeps: {
    exclude: ['@ghostpost/stacklive-integration']
  },
  server: {
    fs: {
      allow: ['./modules/ghostpost']
    }
  }
}
```

## 🤝 Support & Troubleshooting

Common issues and solutions:

1. **WASM fails to load**
   - Check MIME type is `application/wasm`
   - Verify file path is correct
   - Check browser console for errors

2. **Detection not working**
   - Ensure `initStackLive()` was called
   - Check that invisible characters weren't stripped
   - Verify text contains proper encoding

3. **Events not firing**
   - Confirm event listener is registered before encoding/decoding
   - Check browser console for errors
   - Verify `stackliveAdapter` is initialized

## 📚 Additional Resources

- [Main README](./README.md) - Package overview
- [Examples](./examples/README.md) - Working code examples
- [Overlay Runtime](./overlay-runtime/README.md) - Pattern detection details
- [GhostPost Repo](https://github.com/rkendel1/ghostpost) - Source code

## 📄 License

MIT - Same as GhostPost project
