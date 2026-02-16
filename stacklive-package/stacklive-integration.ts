/**
 * StackLive Integration Module
 * 
 * Main entry point for integrating GhostPost encoding/decoding into StackLive.
 * This module provides a clean API for encoding, decoding, and detecting hidden content.
 */

import init, { encode_message, decode_message } from './wasm/wasm.js';
import { stackliveAdapter, type DetectionResult } from './overlay-runtime';

// StackLive delimiter for experience tracking
const STACKLIVE_DELIMITER = '||stacklive:';
const DELIMITER_END = '||';

// Track initialization state
let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Result of encoding operation
 */
export interface EncodingResult {
  encoded: string;
  visibleLength: number;
  hiddenLength: number;
  totalLength: number;
  experienceId?: string;
}

/**
 * Result of decoding operation
 */
export interface DecodingResult {
  message: string;
  experienceId?: string;
}

/**
 * Initialize StackLive integration
 * Call this once before using any encoding/decoding functions
 */
export async function initStackLive(): Promise<void> {
  if (initialized) {
    return;
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    try {
      // Initialize WASM module
      await init();
      
      // Initialize overlay runtime
      await stackliveAdapter.initialize();
      
      initialized = true;
      console.log('[StackLive] Integration initialized successfully');
    } catch (error) {
      console.error('[StackLive] Initialization failed:', error);
      throw error;
    }
  })();
  
  return initPromise;
}

/**
 * Encode a message for StackLive with experience tracking
 * 
 * @param visibleMessage - The message that will be shown publicly
 * @param secretMessage - The hidden message to encode
 * @param enableTracking - Whether to include an experience ID (default: true)
 * @returns Object with encoded message, character counts, and experienceId
 * 
 * @example
 * const result = await encodeForStackLive(
 *   "Check out this cool post!",
 *   "But the real message is hidden here",
 *   true
 * );
 * console.log(result.encoded); // Post this anywhere
 * console.log(result.experienceId); // Track decodes with this ID
 */
export async function encodeForStackLive(
  visibleMessage: string,
  secretMessage: string,
  enableTracking = true
): Promise<EncodingResult> {
  await initStackLive();

  let finalSecret = secretMessage;
  let experienceId: string | undefined;

  if (enableTracking) {
    // Generate unique experience ID
    experienceId = generateExperienceId();
    finalSecret = `${secretMessage}${STACKLIVE_DELIMITER}${experienceId}${DELIMITER_END}`;
  }

  // Use WASM to encode the message
  const encoded = encode_message(visibleMessage, finalSecret);
  
  return {
    encoded,
    visibleLength: visibleMessage.length,
    hiddenLength: finalSecret.length,
    totalLength: encoded.length,
    experienceId,
  };
}

/**
 * Decode a StackLive message to reveal hidden content
 * 
 * @param encodedMessage - The message containing the hidden secret
 * @param autoLaunch - Whether to auto-launch the experience (default: false)
 * @returns Object with decoded message and experienceId
 * 
 * @example
 * const decoded = await decodeForStackLive(encodedText, true);
 * console.log(decoded.message); // The secret message
 * console.log(decoded.experienceId); // Track who decoded it
 */
export async function decodeForStackLive(
  encodedMessage: string,
  autoLaunch = false
): Promise<DecodingResult> {
  await initStackLive();
  
  // First, scan for patterns to validate
  const detection = await stackliveAdapter.scanText(encodedMessage);
  
  if (!detection?.detected) {
    throw new Error('No valid StackLive experience detected in message');
  }

  // Decode using WASM
  const decoded = decode_message(encodedMessage);
  
  // Extract experienceId from decoded message
  let message = decoded;
  let experienceId: string | undefined;
  
  const idIndex = message.indexOf(STACKLIVE_DELIMITER);
  if (idIndex !== -1) {
    const idStart = idIndex + STACKLIVE_DELIMITER.length;
    const idEnd = message.indexOf(DELIMITER_END, idStart);
    if (idEnd !== -1) {
      experienceId = message.substring(idStart, idEnd);
      message = message.substring(0, idIndex);
    }
  }
  
  // Auto-launch experience if requested
  if (autoLaunch && experienceId) {
    await stackliveAdapter.launchExperience(experienceId, {
      metadata: { source: 'manual_decode' }
    });
  }

  return { message, experienceId };
}

/**
 * Scan text for StackLive experiences without decoding
 * Useful for checking if content contains hidden messages
 * 
 * @param text - Text to scan for hidden content
 * @returns Detection result or null if no pattern found
 * 
 * @example
 * const detection = await scanForExperiences(userPost);
 * if (detection?.detected) {
 *   showRevealButton();
 * }
 */
export async function scanForExperiences(text: string): Promise<DetectionResult | null> {
  await initStackLive();
  return stackliveAdapter.scanText(text);
}

/**
 * Launch a StackLive experience by ID
 * 
 * @param experienceId - The experience identifier
 * @param metadata - Optional metadata to attach
 * 
 * @example
 * await launchExperience('exp_abc123', {
 *   source: 'social_feed',
 *   platform: 'stacklive'
 * });
 */
export async function launchExperience(
  experienceId: string, 
  metadata?: Record<string, unknown>
): Promise<void> {
  await initStackLive();
  await stackliveAdapter.launchExperience(experienceId, { metadata });
}

/**
 * Get current overlay state
 * 
 * @returns Current state: 'idle' | 'signal_detected' | 'experience_available' | 'runtime_active'
 * 
 * @example
 * const state = getOverlayState();
 * if (state === 'signal_detected') {
 *   console.log('Pattern detected, ready to decode');
 * }
 */
export function getOverlayState() {
  return stackliveAdapter.getState();
}

/**
 * Get overlay state UI representation
 * Useful for showing visual indicators
 * 
 * @returns Object with icon, color, description, and pulsing state
 * 
 * @example
 * const ui = getOverlayStateUI();
 * element.style.backgroundColor = ui.color;
 * element.textContent = ui.description;
 */
export function getOverlayStateUI() {
  return stackliveAdapter.getStateUI();
}

/**
 * Listen for StackLive detection events
 * 
 * @param listener - Event listener callback
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = onExperienceDetected((event) => {
 *   console.log('Event type:', event.type);
 *   if (event.type === 'EXPERIENCE_RESOLVED') {
 *     console.log('Experience ID:', event.experienceId);
 *   }
 * });
 * 
 * // Later: cleanup
 * unsubscribe();
 */
export function onExperienceDetected(
  listener: (event: { type: string; experienceId?: string; [key: string]: unknown }) => void
): () => void {
  return stackliveAdapter.addEventListener(listener);
}

/**
 * Generate a unique experience ID
 * Uses crypto.randomUUID if available, otherwise fallback to timestamp + random
 * 
 * @returns Experience ID in format: exp_XXXXXXXXXXXXXXXX
 */
function generateExperienceId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `exp_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  }
  
  // Fallback to timestamp + random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `exp_${timestamp}${random}`;
}

/**
 * Backward compatibility: Support legacy ghostid delimiter
 * 
 * @param encodedMessage - Message to decode
 * @returns Decoded result with type indicator
 * 
 * @example
 * const result = await decodeWithLegacySupport(oldMessage);
 * console.log(result.type); // 'stacklive' or 'ghost'
 */
export async function decodeWithLegacySupport(
  encodedMessage: string
): Promise<{ message: string; id?: string; type: 'stacklive' | 'ghost' }> {
  await initStackLive();
  
  const decoded = decode_message(encodedMessage);
  let message = decoded;
  let id: string | undefined;
  let type: 'stacklive' | 'ghost' = 'ghost';
  
  // Check for StackLive delimiter first
  let idIndex = message.indexOf(STACKLIVE_DELIMITER);
  if (idIndex !== -1) {
    type = 'stacklive';
    const idStart = idIndex + STACKLIVE_DELIMITER.length;
    const idEnd = message.indexOf(DELIMITER_END, idStart);
    if (idEnd !== -1) {
      id = message.substring(idStart, idEnd);
      message = message.substring(0, idIndex);
    }
  } else {
    // Fall back to Ghost delimiter
    const ghostDelimiter = '||ghostid:';
    idIndex = message.indexOf(ghostDelimiter);
    if (idIndex !== -1) {
      const idStart = idIndex + ghostDelimiter.length;
      const idEnd = message.indexOf(DELIMITER_END, idStart);
      if (idEnd !== -1) {
        id = message.substring(idStart, idEnd);
        message = message.substring(0, idIndex);
      }
    }
  }
  
  return { message, id, type };
}

// Re-export overlay runtime types and utilities for advanced usage
export {
  stackliveAdapter,
  type DetectionResult,
  type OverlayState,
  type ExperienceContext,
} from './overlay-runtime';

export type { EncodingResult, DecodingResult };
