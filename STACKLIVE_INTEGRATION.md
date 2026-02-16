# StackLive Integration Guide

This guide explains how to use the StackLive overlay runtime in the GhostPost application.

## Overview

The StackLive integration provides:
- **Pattern Detection**: Automatic detection of hidden experiences in text
- **Event System**: EXPERIENCE_DETECTED events instead of simple content found messages
- **Overlay States**: Visual feedback through state machine (idle → signal detected → experience available → runtime active)
- **Runtime Bridge**: Integration layer for launching StackLive experiences

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │   Content    │→ │   Background  │→ │    Sidebar      │  │
│  │   Script     │  │    Script     │  │     Panel       │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
│         │                  │                                 │
│         ↓                  ↓                                 │
│  EXPERIENCE_DETECTED   Badge Update                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              StackLive Overlay Runtime                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pattern Detector  │  State Machine  │  Runtime Bridge│  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              StackLive Adapter                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (SvelteKit)                   │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  stacklive.ts│  │  ghostpost.ts  │  │  Components    │  │
│  └──────────────┘  └────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Encoding with StackLive

```typescript
import { encodeForStackLive } from '$lib/stacklive';

// Encode a message with StackLive tracking
const result = await encodeForStackLive(
  "Public message visible to everyone",
  "Secret content hidden in plain sight",
  true // Enable tracking
);

console.log('Encoded:', result.encoded);
console.log('Experience ID:', result.experienceId);
console.log('Total length:', result.totalLength);
```

### 2. Decoding with StackLive

```typescript
import { decodeForStackLive } from '$lib/stacklive';

// Decode and auto-launch experience
const result = await decodeForStackLive(
  encodedMessage,
  true // Auto-launch
);

console.log('Decoded message:', result.message);
console.log('Experience ID:', result.experienceId);
```

### 3. Scanning for Experiences

```typescript
import { scanForExperiences } from '$lib/stacklive';

const text = "Some text that might contain hidden content...";
const detection = await scanForExperiences(text);

if (detection?.detected) {
  console.log('Found experience!');
  console.log('Character count:', detection.charCount);
  console.log('Is clustered:', detection.isClustered);
  console.log('Has complete message:', detection.hasCompleteMessage);
}
```

### 4. Listening for Events

```typescript
import { onExperienceDetected } from '$lib/stacklive';

// Listen for detection events
const unsubscribe = onExperienceDetected((event) => {
  console.log('Event type:', event.type);
  
  if (event.type === 'PATTERN_DETECTED') {
    console.log('Pattern detected:', event.detection);
  } else if (event.type === 'EXPERIENCE_RESOLVED') {
    console.log('Experience ID:', event.experienceId);
  }
});

// Later: clean up
unsubscribe();
```

### 5. Monitoring Overlay State

```typescript
import { getOverlayState, getOverlayStateUI } from '$lib/stacklive';

// Get current state
const state = getOverlayState();
console.log('Current state:', state); // 'idle' | 'signal_detected' | etc.

// Get UI representation
const ui = getOverlayStateUI();
console.log('Icon:', ui.icon);
console.log('Color:', ui.color);
console.log('Description:', ui.description);
console.log('Pulsing:', ui.pulsing);
```

## Svelte Component Example

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    encodeForStackLive, 
    decodeForStackLive, 
    getOverlayStateUI,
    onExperienceDetected 
  } from '$lib/stacklive';
  
  let visibleMessage = '';
  let secretMessage = '';
  let encodedResult = '';
  let overlayUI = { icon: 'orb', color: '#9ca3af', description: 'Idle', pulsing: false };
  
  // Update overlay UI when state changes
  function updateOverlayUI() {
    overlayUI = getOverlayStateUI();
  }
  
  onMount(() => {
    // Listen for experience detection events
    const unsubscribe = onExperienceDetected((event) => {
      console.log('Experience event:', event);
      updateOverlayUI();
    });
    
    return () => {
      unsubscribe();
    };
  });
  
  async function handleEncode() {
    try {
      const result = await encodeForStackLive(visibleMessage, secretMessage);
      encodedResult = result.encoded;
      console.log('Encoded with experience ID:', result.experienceId);
    } catch (error) {
      console.error('Encoding failed:', error);
    }
  }
  
  async function handleDecode() {
    try {
      const result = await decodeForStackLive(encodedResult, true);
      console.log('Decoded:', result.message);
      console.log('Experience ID:', result.experienceId);
      updateOverlayUI();
    } catch (error) {
      console.error('Decoding failed:', error);
    }
  }
</script>

<div class="stacklive-demo">
  <h2>StackLive Experience Creator</h2>
  
  <!-- Encode Section -->
  <div class="section">
    <input bind:value={visibleMessage} placeholder="Visible message" />
    <input bind:value={secretMessage} placeholder="Secret message" />
    <button on:click={handleEncode}>Encode for StackLive</button>
  </div>
  
  <!-- Result -->
  {#if encodedResult}
    <div class="result">
      <p>Encoded: {encodedResult}</p>
      <button on:click={handleDecode}>Decode & Launch</button>
    </div>
  {/if}
  
  <!-- Overlay State Indicator -->
  <div class="overlay-indicator" style="background-color: {overlayUI.color}">
    <span class:pulsing={overlayUI.pulsing}>
      {overlayUI.description}
    </span>
  </div>
</div>

<style>
  .pulsing {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
```

## Browser Extension Integration

The browser extension automatically detects StackLive experiences and emits events:

```javascript
// content.js - Automatic detection
const detection = detectPattern(text);
if (detection.detected) {
  chrome.runtime.sendMessage({
    type: 'EXPERIENCE_DETECTED',
    count: 1,
    experiences: [{
      experienceId: extractExperienceId(text),
      text: text,
      detectedAt: Date.now()
    }]
  });
}
```

## Migration from GhostPost

### Old Code (GhostPost)
```typescript
import { encodeMessage, decodeMessage } from '$lib/ghostpost';

const encoded = await encodeMessage("visible", "secret", true);
const decoded = await decodeMessage(encoded);
console.log('Post ID:', decoded.postId); // ghostid
```

### New Code (StackLive)
```typescript
import { encodeForStackLive, decodeForStackLive } from '$lib/stacklive';

const encoded = await encodeForStackLive("visible", "secret", true);
const decoded = await decodeForStackLive(encoded);
console.log('Experience ID:', decoded.experienceId); // stacklive
```

### Backward Compatibility
```typescript
import { decodeWithLegacySupport } from '$lib/stacklive';

const result = await decodeWithLegacySupport(encoded);
console.log('Message:', result.message);
console.log('ID:', result.id);
console.log('Type:', result.type); // 'stacklive' or 'ghost'
```

## Overlay States

The overlay state machine provides visual feedback:

| State | Description | Visual | Trigger |
|-------|-------------|--------|---------|
| `idle` | No detection | Small gray orb | Initial state |
| `signal_detected` | Pattern found | Pulsing purple orb | Pattern detected |
| `experience_available` | Ready to launch | Green ring | Experience resolved |
| `runtime_active` | Experience running | Expanded panel | Runtime launched |

## Testing

Use the demo.html file to test the overlay runtime:

```bash
# Open in browser
open packages/overlay-runtime/demo.html

# Or serve with a local server
npx serve packages/overlay-runtime
```

## API Reference

See the full API documentation in:
- `/packages/overlay-runtime/README.md` - Overlay runtime package
- `/src/lib/stacklive.ts` - StackLive integration module

## Troubleshooting

### "No valid StackLive experience detected"
- Ensure the text contains invisible Unicode characters
- Check that the message has proper delimiters (\uFEFF)
- Verify minimum character count (8+)

### Events not firing
- Ensure `initStackLive()` is called before using any functions
- Check browser console for errors
- Verify event listeners are registered before detection

### State not updating
- Call `getOverlayStateUI()` after state changes
- Use `onExperienceDetected()` to listen for state transitions
- Check that detection threshold is met

## Examples

See working examples in:
- `/packages/overlay-runtime/demo.html` - Interactive demo
- `/browser-extension/` - Browser extension implementation
- `/src/routes/compose/` - Encoding UI (to be updated)
- `/src/routes/decode/` - Decoding UI (to be updated)
