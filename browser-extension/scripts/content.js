/**
 * Content Script - Scans page for hidden content
 * Detects invisible Unicode characters used by Hidenly encoding
 */

// List of invisible Unicode characters used for encoding
const INVISIBLE_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\u2060', // Word Joiner
  '\u2061', // Function Application
  '\u2062', // Invisible Times
  '\u2063', // Invisible Separator
  '\u2064', // Invisible Plus
  '\uFEFF', // Zero Width No-Break Space
  '\u180E', // Mongolian Vowel Separator
];

// Create regex pattern to detect invisible characters - escape each character
const escapedChars = INVISIBLE_CHARS.map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const invisibleCharRegex = new RegExp(`[${escapedChars.join('')}]`, 'g');

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
    if (text && invisibleCharRegex.test(text)) {
      // Found invisible characters - likely hidden content
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
