# StackLive Overlay Runtime

Pattern detection and experience integration for StackLive.

## Overview

This package provides the core infrastructure for detecting hidden content patterns and integrating with the StackLive runtime. It replaces the Ghost-branded detection system with StackLive-compatible architecture.

## Package Structure

```
packages/overlay-runtime/
├── wasm/                      # WASM encoding/decoding engine (linked from root)
├── overlay-core/              # Core overlay functionality
│   ├── stackliveRuntimeBridge.ts   # Runtime integration & event system
│   └── overlayStateMachine.ts      # State management
├── pattern-detector/          # Pattern detection algorithm
│   └── detector.ts            # Invisible character detection
├── stacklive-adapter/         # Main integration adapter
│   └── adapter.ts             # Primary entry point
└── assets/                    # StackLive branding assets
    ├── stacklive-orb.svg      # Orb icon for overlay states
    └── logo-mark.svg          # StackLive logo mark
```

## Features

### Pattern Detection
- Detects invisible Unicode characters used for encoding
- Validates complete encoded messages
- Reduces false positives with clustering analysis
- Supports GhostPost and StackLive encoding formats

### Overlay States
- **idle**: Monitoring for signals (small gray orb)
- **signal_detected**: Pattern detected (pulsing purple orb)
- **experience_available**: Ready to decode (green ring)
- **runtime_active**: Experience running (expanded panel)

### Event System
- Emits `EXPERIENCE_DETECTED` events
- Supports event listeners for runtime integration
- Structured event data with metadata

## Usage

### Basic Detection

```typescript
import { scanForStackLive } from '@stacklive/overlay-runtime';

const text = 'Some text with hidden content...';
const result = await scanForStackLive(text);

if (result?.detected) {
  console.log('Found hidden content:', result);
}
```

### Launch Experience

```typescript
import { launchStackLiveExperience } from '@stacklive/overlay-runtime';

await launchStackLiveExperience('exp_abc123', {
  position: { x: 100, y: 200 },
  metadata: { source: 'twitter' }
});
```

### Listen for Events

```typescript
import { stackliveAdapter } from '@stacklive/overlay-runtime';

stackliveAdapter.addEventListener((event) => {
  console.log('Detection event:', event.type);
  
  if (event.type === 'PATTERN_DETECTED') {
    console.log('Pattern found:', event.detection);
  }
});
```

### State Management

```typescript
import { overlayStateMachine } from '@stacklive/overlay-runtime';

// Get current state
const state = overlayStateMachine.getState();

// Get UI representation
const ui = overlayStateMachine.getStateUI();
console.log(`State: ${ui.description}, Color: ${ui.color}, Pulsing: ${ui.pulsing}`);

// Listen for state changes
overlayStateMachine.onStateChange((stateData) => {
  console.log('State changed to:', stateData.state);
});
```

## Detection Flow

```
1. Pattern Detection
   ↓
2. PATTERN_DETECTED event emitted
   ↓
3. State → signal_detected (pulsing orb)
   ↓
4. Experience Resolution (extract ID)
   ↓
5. EXPERIENCE_RESOLVED event emitted
   ↓
6. State → experience_available (green ring)
   ↓
7. Launch Experience (auto or manual)
   ↓
8. RUNTIME_LAUNCHED event emitted
   ↓
9. State → runtime_active (expanded panel)
   ↓
10. Experience completes
    ↓
11. State → idle (reset)
```

## Migration from GhostPost

### Old (GhostPost)
```javascript
// content.js
chrome.runtime.sendMessage({ 
  type: 'HIDDEN_CONTENT_FOUND',
  text: encodedText 
});
```

### New (StackLive)
```typescript
// Using StackLive adapter
import { scanForStackLive } from '@stacklive/overlay-runtime';

const result = await scanForStackLive(encodedText);
// Automatically emits EXPERIENCE_DETECTED event
```

## Configuration

```typescript
import { StackLiveAdapter } from '@stacklive/overlay-runtime';

const adapter = new StackLiveAdapter({
  apiUrl: 'https://stacklive.dev',
  enableAnalytics: true,
  debugMode: true,
  autoLaunch: true  // Auto-launch experiences when detected
});

await adapter.initialize();
```

## Assets

### StackLive Orb (`stacklive-orb.svg`)
Circular gradient orb with pulsing effect. Used for overlay states:
- Idle: Gray, static
- Signal Detected: Purple, pulsing
- Experience Available: Green ring
- Runtime Active: Expanded

### Logo Mark (`logo-mark.svg`)
Stylized "SL" with dynamic stack effect. Used for branding in overlay UI.

## Development

### Testing Pattern Detection

```typescript
import { detectPattern } from '@stacklive/overlay-runtime/detector';

const text = '\uFEFF\u200B\u200C\u200D\uFEFF'; // Encoded text
const result = detectPattern(text);

console.log('Detected:', result.detected);
console.log('Char count:', result.charCount);
console.log('Is clustered:', result.isClustered);
console.log('Has complete message:', result.hasCompleteMessage);
```

### Debug Mode

Set `debugMode: true` in configuration to enable detailed logging:

```typescript
const adapter = new StackLiveAdapter({ debugMode: true });
```

This will log:
- Pattern detection results
- State transitions
- Event emissions
- Runtime operations

## License

MIT
