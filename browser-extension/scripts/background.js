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
	// Handle EXPERIENCE_DETECTED event (new StackLive format)
	if (request.type === 'EXPERIENCE_DETECTED') {
		const tabId = sender.tab?.id;
		if (tabId) {
			tabData.set(tabId, {
				count: request.count,
				url: request.url,
				experiences: request.experiences,
				timestamp: Date.now()
			});

			console.log(`[StackLive Background] Stored experience data for tab ${tabId}:`, {
				count: request.count,
				experienceIds: request.experiences.map(e => e.experienceId)
			});
		}
	}
	
	// Handle legacy HIDDEN_CONTENT_FOUND event for backward compatibility
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

			console.log(`[StackLive Background] Stored hidden content data for tab ${tabId}`);
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
		chrome.tabs
			.query({ active: true, currentWindow: true })
			.then((tabs) => {
				if (tabs[0]) {
					const data = tabData.get(tabs[0].id);
					sendResponse({ success: true, data: data || null });
				} else {
					sendResponse({ success: false, data: null });
				}
			})
			.catch((error) => {
				console.error('[StackLive Background] Error querying tabs:', error);
				sendResponse({ success: false, data: null, error: error.message });
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
			color: '#667eea' // StackLive purple
		});
		chrome.action.setTitle({
			tabId: tabId,
			title: `StackLive - ${count} experience${count > 1 ? 's' : ''} detected`
		});
	} else {
		chrome.action.setBadgeText({
			tabId: tabId,
			text: ''
		});
		chrome.action.setTitle({
			tabId: tabId,
			title: 'StackLive - No experiences detected'
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

console.log('[StackLive Background] Service worker initialized');
