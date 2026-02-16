/**
 * StackLive Integration Module
 * 
 * Integrates GhostPost WASM encoding/decoding with StackLive overlay runtime.
 * This module bridges the existing ghostpost.ts functionality with the new
 * StackLive event-driven architecture.
 */

import { encodeMessage as ghostpostEncode, decodeMessage as ghostpostDecode, initWasm } from './ghostpost';
import { stackliveAdapter, type DetectionResult } from '../../packages/overlay-runtime';
import type { EncodingResult } from './types/encoding';

// Use StackLive delimiter instead of ghostid
const STACKLIVE_DELIMITER = '||stacklive:';
const DELIMITER_END = '||';

/**
 * Initialize StackLive integration
 */
export async function initStackLive(): Promise<void> {
  await initWasm();
  await stackliveAdapter.initialize();
}

/**
 * Encode a message for StackLive with experience tracking
 * @param visibleMessage - The message that will be shown publicly
 * @param secretMessage - The hidden message to encode
 * @param enableTracking - Whether to include an experience ID (default: true)
 * @returns Object with encoded message, character counts, and experienceId
 */
export async function encodeForStackLive(
  visibleMessage: string,
  secretMessage: string,
  enableTracking = true
): Promise<EncodingResult & { experienceId?: string }> {
  await initStackLive();

  let finalSecret = secretMessage;
  let experienceId: string | undefined;

  if (enableTracking) {
    // Generate experience ID
    experienceId = generateExperienceId();
    finalSecret = `${secretMessage}${STACKLIVE_DELIMITER}${experienceId}${DELIMITER_END}`;
  }

  // Use existing ghostpost encoding
  const result = await ghostpostEncode(visibleMessage, finalSecret, false);
  
  return {
    ...result,
    experienceId,
  };
}

/**
 * Decode a StackLive message and trigger experience detection
 * @param encodedMessage - The message containing the hidden secret
 * @param autoLaunch - Whether to auto-launch the experience (default: false)
 * @returns Object with decoded message and experienceId
 */
export async function decodeForStackLive(
  encodedMessage: string,
  autoLaunch = false
): Promise<{ message: string; experienceId?: string }> {
  await initStackLive();
  
  // First, scan for patterns
  const detection = await stackliveAdapter.scanText(encodedMessage);
  
  if (!detection?.detected) {
    throw new Error('No valid StackLive experience detected in message');
  }

  // Decode using existing ghostpost function
  const decoded = await ghostpostDecode(encodedMessage);
  
  // Extract experienceId from decoded message
  let message = decoded.message;
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
  
  // Auto-launch if requested
  if (autoLaunch && experienceId) {
    await stackliveAdapter.launchExperience(experienceId, {
      metadata: { source: 'manual_decode' }
    });
  }

  return { message, experienceId };
}

/**
 * Scan text for StackLive experiences without decoding
 * @param text - Text to scan
 * @returns Detection result or null
 */
export async function scanForExperiences(text: string): Promise<DetectionResult | null> {
  await initStackLive();
  return stackliveAdapter.scanText(text);
}

/**
 * Launch a StackLive experience by ID
 * @param experienceId - The experience identifier
 * @param metadata - Optional metadata
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
 */
export function getOverlayState() {
  return stackliveAdapter.getState();
}

/**
 * Get overlay state UI representation
 */
export function getOverlayStateUI() {
  return stackliveAdapter.getStateUI();
}

/**
 * Listen for StackLive detection events
 * @param listener - Event listener callback
 * @returns Unsubscribe function
 */
export function onExperienceDetected(
  listener: (event: { type: string; experienceId?: string }) => void
): () => void {
  return stackliveAdapter.addEventListener(listener);
}

/**
 * Generate a unique experience ID
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
 * Backward compatibility: Support ghostid delimiter
 */
export async function decodeWithLegacySupport(
  encodedMessage: string
): Promise<{ message: string; id?: string; type: 'stacklive' | 'ghost' }> {
  await initStackLive();
  
  const decoded = await ghostpostDecode(encodedMessage);
  let message = decoded.message;
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

// Re-export overlay runtime functionality for convenience
export {
  stackliveAdapter,
  overlayStateMachine,
  runtimeBridge,
  type DetectionResult,
  type OverlayState,
  type ExperienceContext,
} from '../../packages/overlay-runtime';
