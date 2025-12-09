/**
 * Background Service Worker
 * Handles communication between content script and sidebar
 */

// Store hidden content data per tab
const tabData = new Map();

/**
 * Handle messages from content scripts and sidebar
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'HIDDEN_CONTENT_FOUND') {
    // Store data for this tab
    const tabId = sender.tab?.id;
    if (tabId) {
      tabData.set(tabId, {
        count: request.count,
        url: request.url,
        results: request.results,
        timestamp: Date.now()
      });
      
      console.log(`[Hidenly Background] Stored hidden content data for tab ${tabId}`);
    }
  }
  
  if (request.type === 'UPDATE_BADGE') {
    const tabId = sender.tab?.id;
    if (tabId) {
      updateBadge(tabId, request.count);
    }
  }
  
  if (request.type === 'GET_TAB_DATA') {
    // Request from sidebar for current tab's data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const data = tabData.get(tabs[0].id);
        sendResponse({ success: true, data: data || null });
      } else {
        sendResponse({ success: false, data: null });
      }
    });
    return true; // Keep channel open for async response
  }
});

/**
 * Update extension badge with count
 */
function updateBadge(tabId, count) {
  if (count > 0) {
    chrome.action.setBadgeText({
      tabId: tabId,
      text: count.toString()
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: tabId,
      color: '#4CAF50'
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: `Hidenly - ${count} hidden message${count > 1 ? 's' : ''} found`
    });
  } else {
    chrome.action.setBadgeText({
      tabId: tabId,
      text: ''
    });
    chrome.action.setTitle({
      tabId: tabId,
      title: 'Hidenly - No hidden content detected'
    });
  }
}

/**
 * Clean up data when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});

/**
 * Handle extension icon click - open sidebar
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

console.log('[Hidenly Background] Service worker initialized');
