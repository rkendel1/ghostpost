/**
 * Content Script - Scans page for hidden content
 * Detects invisible Unicode characters used by Hidenly encoding
 */

// List of invisible Unicode characters used for encoding
// Based on the Hidenly encoding scheme which uses specific characters
const HIDENLY_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\u200E', // Left-to-Right Mark
  '\u200F', // Right-to-Left Mark
  '\u202C', // Pop Directional Formatting
  '\u202D', // Left-to-Right Override
  '\u2060', // Word Joiner
];

// Create regex pattern to detect invisible characters - escape each character
const escapedChars = HIDENLY_CHARS.map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const invisibleCharRegex = new RegExp(`[${escapedChars.join('')}]`, 'g');

// Minimum threshold - Hidenly uses pairs of chars, so minimum 8 chars = ~4 base64 chars
const MIN_INVISIBLE_CHAR_COUNT = 8;

// Maximum ratio of invisible chars to total text length (to filter out sparse occurrences)
const MAX_INVISIBLE_RATIO = 0.5;

// Threshold for considering sparse invisible chars as legitimate formatting
const SPARSE_RATIO_THRESHOLD = 0.01;
const SPARSE_COUNT_THRESHOLD = 20;

// Threshold for high invisible char count that likely indicates encoded content
const HIGH_COUNT_THRESHOLD = 30;

/**
 * Check if text likely contains a Hidenly encoded message
 * Returns false for legitimate uses like RTL text support
 */
function isLikelyHidenlyMessage(text) {
  const matches = text.match(invisibleCharRegex);
  
  if (!matches || matches.length < MIN_INVISIBLE_CHAR_COUNT) {
    return false;
  }
  
  // Calculate ratio of invisible chars to total length
  const ratio = matches.length / text.length;
  
  // If there are too few invisible chars relative to text length AND few total chars,
  // it's likely legitimate formatting (e.g., a few RTL marks in longer text)
  // Both conditions must be true to avoid false negatives
  if (ratio < SPARSE_RATIO_THRESHOLD && matches.length < SPARSE_COUNT_THRESHOLD) {
    return false;
  }
  
  // If the invisible chars make up too much of the text (high ratio) OR there's
  // a high absolute count, it's likely encoded content. Either condition alone
  // is sufficient since encoded messages have characteristic patterns:
  // - High ratio: pure or mostly encoded text
  // - High count: long encoded message with visible text
  if (ratio > MAX_INVISIBLE_RATIO || matches.length > HIGH_COUNT_THRESHOLD) {
    return true;
  }
  
  // For counts between thresholds, accept any count since Hidenly uses pairs
  // (we already checked minimum count above)
  return true;
}

/**
 * Scan the entire page for hidden content
 */
function scanPageForHiddenContent() {
  const detectedElements = [];
  
  // Get all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    if (text && isLikelyHidenlyMessage(text)) {
      // Found invisible characters that match Hidenly pattern
      const element = node.parentElement;
      if (element && !detectedElements.includes(element)) {
        detectedElements.push({
          element: element,
          text: text,
          location: getElementLocation(element)
        });
      }
    }
  }

  return detectedElements;
}

/**
 * Get a readable location description for an element
 */
function getElementLocation(element) {
  const tag = element.tagName.toLowerCase();
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const id = element.id ? `#${element.id}` : '';
  return `${tag}${id}${classes}`;
}

/**
 * Initial scan when page loads
 */
function performInitialScan() {
  const results = scanPageForHiddenContent();
  
  if (results.length > 0) {
    console.log(`[Hidenly] Found ${results.length} elements with hidden content`);
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'HIDDEN_CONTENT_FOUND',
      count: results.length,
      url: window.location.href,
      results: results.map(r => ({
        text: r.text,
        location: r.location
      }))
    });
    
    // Update badge
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      count: results.length
    });
  } else {
    console.log('[Hidenly] No hidden content detected on this page');
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      count: 0
    });
  }
}

/**
 * Listen for requests from sidebar to get hidden content
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_HIDDEN_CONTENT') {
    const results = scanPageForHiddenContent();
    sendResponse({
      success: true,
      results: results.map(r => ({
        text: r.text,
        location: r.location
      }))
    });
    return true;
  }
  
  if (request.type === 'RESCAN_PAGE') {
    performInitialScan();
    sendResponse({ success: true });
    return true;
  }
});

// Run initial scan when content script loads
performInitialScan();

// Set up a mutation observer to detect dynamically added content
const observer = new MutationObserver((mutations) => {
  let shouldRescan = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any added nodes contain text
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
          shouldRescan = true;
          break;
        }
      }
    }
  }
  
  if (shouldRescan) {
    // Debounce the rescan
    if (window.hidenlyScanTimeout) {
      clearTimeout(window.hidenlyScanTimeout);
    }
    window.hidenlyScanTimeout = setTimeout(performInitialScan, 1000);
  }
});

// Start observing the document
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('[Hidenly] Content script loaded and monitoring for hidden content');
