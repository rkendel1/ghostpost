# GhostPost StackLive Integration Package

This package contains all the essential components from GhostPost that can be easily integrated into the StackLive platform. It's designed to be a drop-in module that provides hidden message encoding/decoding capabilities with minimal dependencies.

## 📦 Package Contents

```
stacklive-package/
├── wasm/                          # WebAssembly encoding/decoding engine
│   ├── wasm.js                   # WASM loader
│   ├── wasm_bg.wasm              # Core WASM binary
│   ├── wasm.d.ts                 # TypeScript definitions
│   └── package.json              # WASM package metadata
│
├── overlay-runtime/               # Pattern detection & overlay system
│   ├── pattern-detector/         # Invisible character detection
│   │   └── detector.ts
│   ├── overlay-core/              # State machine & runtime bridge
│   │   ├── overlayStateMachine.ts
│   │   └── stackliveRuntimeBridge.ts
│   ├── stacklive-adapter/         # Main integration adapter
│   │   └── adapter.ts
│   ├── assets/                    # StackLive branding assets
│   ├── index.ts                   # Package entry point
│   └── package.json               # Package metadata
│
├── userscript/                    # Installation scripts
│   └── ghostpost-reveal.user.js  # Universal overlay button
│
├── web-components/                # Configurable web components
│   ├── stacklive-overlay.ts      # Main overlay component
│   └── index.html                # Demo page
│
├── examples/                      # Integration examples
│   ├── basic-integration.html    # Simple HTML example
│   ├── vanilla-js.html           # Plain JavaScript example
│   └── README.md                 # Examples documentation
│
├── stacklive-integration.ts       # Main integration module
├── package.json                   # Package configuration
└── README.md                      # This file
```

## 🚀 Quick Start

### Installation

```bash
# Copy this package into your StackLive project
cp -r stacklive-package /path/to/stacklive/modules/ghostpost

# Or install dependencies if using as standalone
cd stacklive-package
npm install
```

### Basic Usage

```typescript
import { 
  encodeForStackLive, 
  decodeForStackLive, 
  scanForExperiences 
} from './stacklive-integration';

// Initialize the module
await initStackLive();

// Encode a hidden message
const result = await encodeForStackLive(
  "Public message everyone sees",
  "Secret content only decoders see",
  true // Enable tracking
);
console.log('Encoded:', result.encoded);
console.log('Experience ID:', result.experienceId);

// Decode a message
const decoded = await decodeForStackLive(result.encoded, true);
console.log('Secret:', decoded.message);

// Scan for hidden content
const detection = await scanForExperiences(result.encoded);
console.log('Found:', detection?.detected);
```

## 🔧 Integration into StackLive

### Step 1: Copy Package Files

Copy the entire `stacklive-package` directory into your StackLive project:

```bash
cp -r stacklive-package /path/to/stacklive/modules/ghostpost
```

### Step 2: Import Main Module

In your StackLive application, import the integration module:

```typescript
import { 
  initStackLive,
  encodeForStackLive,
  decodeForStackLive,
  scanForExperiences,
  onExperienceDetected,
  getOverlayState
} from './modules/ghostpost/stacklive-integration';

// Initialize on app start
await initStackLive();
```

### Step 3: Use Pattern Detection

Automatically detect hidden content in text:

```typescript
// Scan user-generated content
const text = getUserContent();
const detection = await scanForExperiences(text);

if (detection?.detected) {
  // Show reveal button or auto-decode
  console.log('Hidden content found!');
}
```

### Step 4: Add Overlay Component (Optional)

Include the web component for automatic detection:

```html
<script type="module" src="./modules/ghostpost/web-components/stacklive-overlay.ts"></script>

<stacklive-overlay
  position="bottom-right"
  auto-scan="true"
  theme="dark">
</stacklive-overlay>
```

## 📚 Core Features

### 1. WASM Encoding/Decoding Engine

High-performance encoding and decoding using WebAssembly:

- **Fast**: Native-speed processing
- **Efficient**: Small binary size (~136KB)
- **Reliable**: Battle-tested encoding algorithm
- **No Dependencies**: Standalone WASM module

### 2. Pattern Detection

Automatically detects invisible Unicode characters:

- Zero-width characters (U+200B, U+200C, U+200D)
- Byte order marks (U+FEFF)
- Word joiners (U+2060)
- Clustering analysis to reduce false positives
- Minimum 8 character threshold

### 3. Overlay State Machine

Visual feedback through distinct states:

| State | Description | Visual Indicator |
|-------|-------------|------------------|
| `idle` | Monitoring | Gray orb |
| `signal_detected` | Pattern found | Pulsing purple |
| `experience_available` | Ready to decode | Green ring |
| `runtime_active` | Running | Expanded panel |

### 4. Event System

Standard events for integration:

```typescript
onExperienceDetected((event) => {
  switch (event.type) {
    case 'PATTERN_DETECTED':
      console.log('Found pattern:', event.detection);
      break;
    case 'EXPERIENCE_RESOLVED':
      console.log('Experience ID:', event.experienceId);
      break;
    case 'RUNTIME_LAUNCHED':
      console.log('Experience started');
      break;
  }
});
```

### 5. Recognition Pattern

The system recognizes the GhostPost encoding pattern:
- Invisible Unicode character sequences
- StackLive delimiter: `||stacklive:ID||`
- Legacy Ghost delimiter: `||ghostid:ID||` (backward compatible)
- Proper message structure validation

## 🎯 Use Cases in StackLive

### Social Feed Integration

```typescript
// Monitor feed for hidden content
const posts = document.querySelectorAll('.feed-post');
posts.forEach(async (post) => {
  const detection = await scanForExperiences(post.textContent);
  if (detection?.detected) {
    // Add reveal button to post
    addRevealButton(post);
  }
});
```

### Content Creation

```typescript
// Allow users to create hidden content
async function createPost(publicText: string, secretText: string) {
  const encoded = await encodeForStackLive(
    publicText,
    secretText,
    true // Enable tracking
  );
  
  // Post to StackLive
  await stacklive.createPost({
    content: encoded.encoded,
    experienceId: encoded.experienceId
  });
}
```

### Experience Tracking

```typescript
// Track when experiences are revealed
onExperienceDetected((event) => {
  if (event.type === 'EXPERIENCE_RESOLVED') {
    // Log to analytics
    stacklive.analytics.track('experience_revealed', {
      experienceId: event.experienceId,
      timestamp: Date.now()
    });
  }
});
```

## 📖 API Reference

### Core Functions

#### `initStackLive(): Promise<void>`

Initialize the WASM module and overlay runtime. Must be called before using other functions.

```typescript
await initStackLive();
```

#### `encodeForStackLive(visibleMessage, secretMessage, enableTracking?)`

Encode a message with hidden content.

**Parameters:**
- `visibleMessage` (string): Public message visible to everyone
- `secretMessage` (string): Hidden message only visible when decoded
- `enableTracking` (boolean, optional): Include experience ID for tracking (default: true)

**Returns:** Promise<EncodingResult>
```typescript
{
  encoded: string;           // Encoded message
  visibleLength: number;     // Length of visible text
  hiddenLength: number;      // Length of hidden text
  totalLength: number;       // Total character count
  experienceId?: string;     // Tracking ID (if enabled)
}
```

#### `decodeForStackLive(encodedMessage, autoLaunch?)`

Decode a message to reveal hidden content.

**Parameters:**
- `encodedMessage` (string): Message containing hidden content
- `autoLaunch` (boolean, optional): Auto-launch the experience (default: false)

**Returns:** Promise<DecodingResult>
```typescript
{
  message: string;          // Decoded secret message
  experienceId?: string;    // Experience ID (if present)
}
```

#### `scanForExperiences(text)`

Scan text for hidden content without decoding.

**Parameters:**
- `text` (string): Text to scan

**Returns:** Promise<DetectionResult | null>
```typescript
{
  detected: boolean;         // Whether pattern was found
  charCount: number;         // Count of invisible characters
  isClustered: boolean;      // Whether chars are clustered
  hasCompleteMessage: boolean; // Whether message appears complete
}
```

#### `onExperienceDetected(listener)`

Listen for detection events.

**Parameters:**
- `listener` (function): Event handler

**Returns:** Unsubscribe function

```typescript
const unsubscribe = onExperienceDetected((event) => {
  console.log(event.type, event);
});

// Later: clean up
unsubscribe();
```

#### `getOverlayState()`

Get current overlay state.

**Returns:** OverlayState
```typescript
'idle' | 'signal_detected' | 'experience_available' | 'runtime_active'
```

## 🛠️ Configuration

### Custom Delimiters

Modify delimiters in `stacklive-integration.ts`:

```typescript
const STACKLIVE_DELIMITER = '||stacklive:';
const DELIMITER_END = '||';
```

### Custom State Icons

Replace SVG assets in `overlay-runtime/assets/`:
- Add your own icon files
- Update references in the overlay components

## 🌐 Browser Compatibility

- Chrome 88+
- Firefox 89+
- Safari 15+
- Edge 88+

**Requirements:**
- WebAssembly support
- ES6 modules
- Custom elements v1 (for web components)

## 🔒 Security & Privacy

- **Local Processing**: All encoding/decoding happens in the browser
- **No Server Required**: Fully client-side operation
- **Privacy-Focused**: No data sent to external servers
- **Optional Tracking**: Experience tracking is opt-in
- **No PII**: Experience IDs are random, not user-identifiable

## 📋 Dependencies

Minimal dependencies for easy integration:

### Required (Included)
- WASM binary (pre-compiled, no Rust needed)
- TypeScript definitions
- Pattern detection module

### Optional
- TypeScript (for development)
- Build tool (webpack, vite, rollup) for bundling

### No External Dependencies
- No npm packages required
- Self-contained module
- No network requests needed

## 🧪 Testing

Test the integration using the included examples:

```bash
# Serve examples locally
npx serve stacklive-package/examples

# Open in browser
open http://localhost:3000/basic-integration.html
```

## 📝 Examples

See the `examples/` directory for:
- **basic-integration.html**: Simple HTML integration
- **vanilla-js.html**: Plain JavaScript usage
- **README.md**: Detailed examples documentation

## 🚀 Production Deployment

### Build Optimization

If bundling for production:

```bash
# Install build tools
npm install --save-dev vite

# Build
npx vite build stacklive-package
```

### CDN Hosting

Host WASM file on CDN for faster loading:

```typescript
import init from 'https://cdn.yoursite.com/wasm/wasm.js';
```

### Lazy Loading

Load WASM only when needed:

```typescript
async function revealMessage(text: string) {
  if (!wasmLoaded) {
    await initStackLive();
    wasmLoaded = true;
  }
  return await decodeForStackLive(text);
}
```

## 🤝 Support

For issues or questions:
- Review the examples in `examples/`
- Check the main GhostPost repository
- Contact StackLive integration support

## 📄 License

MIT License - Same as GhostPost project

## 🔗 Related Links

- [GhostPost Repository](https://github.com/rkendel1/ghostpost)
- [StackLive Platform](https://stacklive.dev)
- [WASM Source Code](../wasm)
- [Overlay Runtime Documentation](../packages/overlay-runtime)
