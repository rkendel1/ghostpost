/**
 * Background Service Worker
 * Handles communication between content script and sidebar
 */

// Store hidden content data per tab
const tabData = new Map();

// Store prefetched references with TTL
const prefetchCache = new Map();
const PREFETCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

	// Handle reference prefetching
	if (request.action === 'prefetchReference') {
		handlePrefetchReference(request.payload, sendResponse);
		return true; // Keep channel open for async response
	}
});

/**
 * Handle reference prefetching
 * Attempts to decode and prefetch referenced content
 */
async function handlePrefetchReference(encodedText, callback) {
	try {
		const cacheKey = `ref:${encodedText.substring(0, 50)}`; // Cache by first 50 chars

		// Check if already cached
		const cached = prefetchCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < PREFETCH_CACHE_TTL) {
			callback(cached.data);
			return;
		}

		// For now, attempt to decode using message to active tab
		// In a full implementation, this would use the WASM directly
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0]) {
				chrome.tabs.sendMessage(
					tabs[0].id,
					{
						action: 'decodeReference',
						payload: encodedText
					},
					(response) => {
						if (response && response.success) {
							// Cache the result
							prefetchCache.set(cacheKey, {
								data: response,
								timestamp: Date.now()
							});
							callback(response);
						} else {
							callback(null);
						}
					}
				);
			}
		});
	} catch (error) {
		console.error('Prefetch error:', error);
		callback(null);
	}
}

/**
 * Periodic cleanup of expired cache entries
 */
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of prefetchCache.entries()) {
		if (now - value.timestamp >= PREFETCH_CACHE_TTL) {
			prefetchCache.delete(key);
		}
	}
}, 60000); // Clean up every minute

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
