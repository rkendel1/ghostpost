/**
 * Pattern Detector
 * 
 * Detects invisible Unicode characters used for Hidenly/GhostPost encoding.
 * Extracted from browser extension content script for StackLive integration.
 */

// List of invisible Unicode characters used for encoding
const HIDENLY_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\u200E', // Left-to-Right Mark
  '\u200F', // Right-to-Left Mark
  '\u202C', // Pop Directional Formatting
  '\u202D', // Left-to-Right Override
  '\u2060', // Word Joiner
  '\uFEFF'  // Zero Width No-Break Space (delimiter)
];

// Detection thresholds
const MIN_INVISIBLE_CHAR_COUNT = 8;
const MAX_INVISIBLE_RATIO = 0.5;
const SPARSE_RATIO_THRESHOLD = 0.01;
const SPARSE_COUNT_THRESHOLD = 20;
const HIGH_COUNT_THRESHOLD = 30;
const MIN_CLUSTER_SIZE = 5;
const CLUSTER_DISTANCE = 50;
const CLUSTER_RATIO_THRESHOLD = 0.6;

// Create regex pattern to detect invisible characters
const escapedChars = HIDENLY_CHARS.map((char) => 
  char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);
const invisibleCharRegex = new RegExp(`[${escapedChars.join('')}]`, 'g');

export interface DetectionResult {
  detected: boolean;
  charCount: number;
  ratio: number;
  isClustered: boolean;
  hasCompleteMessage: boolean;
  positions?: number[];
}

/**
 * Check if invisible characters appear clustered (indicating encoding)
 * vs scattered (indicating legitimate formatting)
 */
function areClustered(text: string, matches: RegExpMatchArray): boolean {
  if (matches.length < MIN_CLUSTER_SIZE) return false;

  // Find positions of all invisible characters
  const positions: number[] = [];
  let index = 0;
  for (const char of text) {
    if (HIDENLY_CHARS.includes(char)) {
      positions.push(index);
    }
    index++;
  }

  if (positions.length < MIN_CLUSTER_SIZE) return false;

  // Check if most invisible chars are close together (clustered)
  let clusteredCount = 0;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] < CLUSTER_DISTANCE) {
      clusteredCount++;
    }
  }

  return clusteredCount / positions.length > CLUSTER_RATIO_THRESHOLD;
}

/**
 * Check if text contains a complete encoded message
 * Format: \uFEFF + invisible_chars + \uFEFF
 */
export function hasCompleteEncodedMessage(text: string): boolean {
  if (!text) return false;

  const delimiterChar = '\uFEFF';

  // Find first delimiter
  const firstDelimIndex = text.indexOf(delimiterChar);
  if (firstDelimIndex === -1) return false;

  // Find second delimiter after the first
  const secondDelimIndex = text.indexOf(delimiterChar, firstDelimIndex + 1);
  if (secondDelimIndex === -1) return false;

  // Extract content between delimiters
  const betweenDelimiters = text.substring(firstDelimIndex + 1, secondDelimIndex);

  // Must have content between delimiters
  if (betweenDelimiters.length === 0) return false;

  // Validate that content between delimiters contains only invisible characters
  const invisibleCharsOnly = HIDENLY_CHARS.filter((char) => char !== '\uFEFF');
  const hasOnlyInvisible = [...betweenDelimiters].every((char) =>
    invisibleCharsOnly.includes(char)
  );

  if (!hasOnlyInvisible) {
    return false;
  }

  return true;
}

/**
 * Check if text likely contains a Hidenly encoded message
 * Returns false for legitimate uses like RTL text support
 */
export function isLikelyHidenlyMessage(text: string): boolean {
  const matches = text.match(invisibleCharRegex);

  if (!matches || matches.length < MIN_INVISIBLE_CHAR_COUNT) {
    return false;
  }

  const ratio = matches.length / text.length;

  // Sparse invisible chars are likely legitimate formatting
  if (ratio < SPARSE_RATIO_THRESHOLD && matches.length < SPARSE_COUNT_THRESHOLD) {
    return false;
  }

  // Check for clustering pattern
  const isClustered = areClustered(text, matches);

  // Not clustered and moderate count = likely formatting
  if (matches.length < HIGH_COUNT_THRESHOLD && !isClustered) {
    return false;
  }

  // High ratio or high count indicates encoding
  if (ratio > MAX_INVISIBLE_RATIO || matches.length > HIGH_COUNT_THRESHOLD) {
    return true;
  }

  // For counts between thresholds, require clustering
  return isClustered;
}

/**
 * Detect invisible characters in text and return detailed results
 */
export function detectPattern(text: string): DetectionResult {
  const matches = text.match(invisibleCharRegex);
  
  if (!matches || matches.length === 0) {
    return {
      detected: false,
      charCount: 0,
      ratio: 0,
      isClustered: false,
      hasCompleteMessage: false,
    };
  }

  const charCount = matches.length;
  const ratio = charCount / text.length;
  const isClustered = areClustered(text, matches);
  const hasCompleteMessage = hasCompleteEncodedMessage(text);
  const detected = isLikelyHidenlyMessage(text);

  // Find positions for debugging
  const positions: number[] = [];
  let index = 0;
  for (const char of text) {
    if (HIDENLY_CHARS.includes(char)) {
      positions.push(index);
    }
    index++;
  }

  return {
    detected,
    charCount,
    ratio,
    isClustered,
    hasCompleteMessage,
    positions,
  };
}

/**
 * Scan text content and return all detected patterns
 */
export function scanForPatterns(text: string): DetectionResult[] {
  if (!text) return [];

  const result = detectPattern(text);
  
  return result.detected ? [result] : [];
}

// Export constants for external use
export const DETECTOR_CONSTANTS = {
  HIDENLY_CHARS,
  MIN_INVISIBLE_CHAR_COUNT,
  MAX_INVISIBLE_RATIO,
  HIGH_COUNT_THRESHOLD,
} as const;
