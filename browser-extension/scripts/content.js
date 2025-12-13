/**
 * Content Script - Scans page for hidden content
 * Detects invisible Unicode characters used by Hidenly encoding
 *
 * ENHANCED FEATURES (v1.2.6):
 * - REVERT: Restored pre-PR115 x.com reveal approach with parent tree walking
 * - Changed extractCompleteText() back to simple parent traversal method (up to 10 levels)
 * - Removed extra "simple approaches" that were added after PR115
 * - This approach better identifies hidden text on x.com (as per issue feedback)
 * - Walks up parent elements and aggregates all text nodes at each level
 * - Checks for complete encoded message (both delimiters) at each parent level
 * - Returns first complete message found during traversal
 * - More reliable detection even if decode/reveal has issues
 * 
 * v1.2.5:
 * - CRITICAL FIX: Hybrid detection approach for X.com reliability
 * - Reverted to broad TreeWalker scan on document.body for all sites
 * - Added X.com-specific filter: only processes text inside tweetText containers
 * - Aggregates full tweet text when X.com tweetText container detected
 * - Fixes detection failures on mobile x.com feeds and lazy-loaded content
 * - Restores reliable detection across all sites while fixing X.com reveal issues
 * 
 * v1.2.4:
 * - CRITICAL FIX: Improved X.com detection reliability with tweet-scoped scanning
 * - Changed scanPageForHiddenContent() to scope detection to tweet articles on X.com
 * - Targets article[data-testid="tweet"] containers first, then scans tweetText inside
 * - Aggregates all text nodes under tweetText container during detection phase
 * - Fixes "zero detection" issue caused by X.com's DOM structure changes in late 2025
 * - More reliable detection by scoping to actual tweets instead of scanning entire page
 * 
 * v1.2.3:
 * - OPTIMIZATION: Simplified X.com text extraction with advanced techniques as backups
 * - Tries simple approaches first (90%+ success): direct node, parent.textContent
 * - Uses complex TreeWalker and sibling aggregation only when simple methods fail
 * - Improved performance by avoiding unnecessary DOM traversal in most cases
 * - Continuous monitoring with MutationObserver
 * - Optimized scanning for social media feeds (Twitter/X, Facebook, LinkedIn, etc.)
 * - Adaptive debounce delays (500ms for social media, 1000ms for regular sites)
 * - Incremental scanning of new nodes for better performance
 * - Periodic background scanning (every 10s) for social media to catch missed updates
 * - Feed-specific DOM selectors for targeted detection
 * 
 * X.COM CONTEXT:
 * X.com's GraphQL API preserves all invisible Unicode characters in the full_text field.
 * The frontend visually collapses them, but they're fully accessible in DOM/API responses.
 * This extension uses tweet-scoped detection for X.com with fallbacks for other sites.
 * See XCOM_API_BEHAVIOR.md for detailed documentation on X.com's behavior and detection methods.
 */

// List of invisible Unicode characters used for encoding
// Based on the Hidenly encoding scheme which uses specific characters
// Must include \uFEFF which is used as delimiter
// NOTE: \uFEFF is included here so that filtering it out in validation
// creates the list of characters that can appear BETWEEN delimiters
const HIDENLY_CHARS = [
	'\u200B', // Zero Width Space
	'\u200C', // Zero Width Non-Joiner
	'\u200D', // Zero Width Joiner
	'\u200E', // Left-to-Right Mark
	'\u200F', // Right-to-Left Mark
	'\u202C', // Pop Directional Formatting
	'\u202D', // Left-to-Right Override
	'\u2060', // Word Joiner
	'\uFEFF' // Zero Width No-Break Space (delimiter)
];

// Create regex pattern to detect invisible characters - escape each character
const escapedChars = HIDENLY_CHARS.map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
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

// Clustering detection constants
const MIN_CLUSTER_SIZE = 5; // Minimum invisible chars needed for clustering analysis
const CLUSTER_DISTANCE = 50; // Maximum characters between invisible chars to be considered clustered
const CLUSTER_RATIO_THRESHOLD = 0.6; // Minimum ratio of clustered chars to confirm encoding

// Scanning performance constants
const PRIORITY_SCAN_MIN_DELAY = 300; // Minimum delay for priority feed scans (ms)
const INCREMENTAL_SCAN_THRESHOLD = 50; // Max new nodes to scan incrementally vs full rescan
const PERIODIC_SCAN_INTERVAL = 10000; // Periodic background scan interval for social media (ms)

/**
 * Quick pre-check using indexOf for performance
 */
function hasInvisibleChars(text) {
	// Quick check for delimiter first (most reliable indicator)
	if (text.indexOf('\uFEFF') !== -1) return true;
	// Check for at least one of the common encoding chars from HIDENLY_CHARS
	for (const char of HIDENLY_CHARS) {
		if (char !== '\uFEFF' && text.indexOf(char) !== -1) {
			return true;
		}
	}
	return false;
}

/**
 * Check if invisible characters appear clustered (indicating encoding)
 * vs scattered (indicating legitimate formatting)
 */
function areClustered(text, matches) {
	if (matches.length < MIN_CLUSTER_SIZE) return false;

	// Find positions of all invisible characters
	const positions = [];
	let index = 0;
	for (const char of text) {
		if (HIDENLY_CHARS.includes(char)) {
			positions.push(index);
		}
		index++;
	}

	if (positions.length < MIN_CLUSTER_SIZE) return false;

	// Check if most invisible chars are close together (clustered)
	// Hidenly encoding typically clusters invisible chars together
	let clusteredCount = 0;
	for (let i = 1; i < positions.length; i++) {
		// If within CLUSTER_DISTANCE characters of previous invisible char, it's clustered
		if (positions[i] - positions[i - 1] < CLUSTER_DISTANCE) {
			clusteredCount++;
		}
	}

	// If more than CLUSTER_RATIO_THRESHOLD are clustered, likely encoded content
	return clusteredCount / positions.length > CLUSTER_RATIO_THRESHOLD;
}

/**
 * Check if text likely contains a Hidenly encoded message
 * Returns false for legitimate uses like RTL text support
 * Enhanced to reduce false positives
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

	// Check for clustering pattern - Hidenly encoding clusters invisible chars
	// If not clustered, likely legitimate formatting scattered through text
	const isClustered = areClustered(text, matches);

	// If we have a moderate number of chars but they're not clustered,
	// it's likely legitimate formatting (e.g., RTL marks throughout a document)
	if (matches.length < HIGH_COUNT_THRESHOLD && !isClustered) {
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

	// For counts between thresholds, require clustering to confirm encoding
	// (we already checked minimum count above)
	return isClustered;
}

/**
 * Helper function to check if text contains a complete encoded message
 * A complete message needs at least TWO delimiter characters (\uFEFF)
 * Format: \uFEFF + invisible_chars + \uFEFF
 * ENHANCED: Validates content between delimiters contains only invisible characters
 * 
 * Design note: We filter \uFEFF from HIDENLY_CHARS to create the list of
 * valid characters that can appear BETWEEN delimiters. This ensures that
 * delimiter characters themselves don't appear in the encoded content.
 */
function hasCompleteEncodedMessage(text) {
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
	// This prevents false positives from legitimate FEFF usage
	// We filter out FEFF since it's the delimiter, not encoding content
	const invisibleCharsOnly = HIDENLY_CHARS.filter(char => char !== '\uFEFF');
	const hasOnlyInvisible = [...betweenDelimiters].every(char => 
		invisibleCharsOnly.includes(char)
	);
	
	if (!hasOnlyInvisible) {
		console.log('[Hidenly] Rejected: visible text found between delimiters');
		return false;
	}
	
	return true;
}

/**
 * Extract complete encoded text from a text node - SIMPLIFIED with advanced fallbacks
 * 
 * STRATEGY: Try simple approaches first, use complex techniques as backups only when needed
 * 
 * CONTEXT: X.com's GraphQL API preserves all invisible Unicode characters in the
 * full_text field. Most of the time (90%+), the complete encoded message is accessible
 * via simple text extraction. Only when X.com's DOM splits the content do we need
 * advanced aggregation techniques.
 * 
 * Extraction order (from simplest to most complex):
 * 1. Direct text node access - works 90%+ of the time
 * 2. Parent element textContent - fast and works for most splits
 * 3. Parent traversal with TreeWalker - handles deep nesting (up to 10 levels)
 * 4. Sibling aggregation - handles horizontal splits across spans
 * 
 * See XCOM_API_BEHAVIOR.md for detailed explanation of X.com's behavior.
 */
function extractCompleteText(node) {
	// Parent tree walking approach (Pre-PR115)
	// This approach provides better identification of hidden text on x.com
	const nodeText = node.data || node.nodeValue || '';
	
	// First, check if the text node itself contains a complete encoded message
	if (nodeText && hasCompleteEncodedMessage(nodeText)) {
		console.log('[Hidenly] [X.com] ✓ Complete message found in text node itself');
		return nodeText;
	}
	
	// Walk up DOM tree to aggregate text from parent elements
	// This handles X.com's complex DOM where content is split across elements
	let currentElement = node.parentElement;
	let levelsChecked = 0;
	const MAX_PARENT_LEVELS = 10;
	
	while (currentElement && levelsChecked < MAX_PARENT_LEVELS) {
		// Get all text from this element by aggregating child text nodes
		let combinedText = '';
		const walker = document.createTreeWalker(
			currentElement,
			NodeFilter.SHOW_TEXT,
			null
		);
		let textNode;
		while ((textNode = walker.nextNode())) {
			combinedText += textNode.data || textNode.nodeValue || '';
		}
		
		// Check if combined text has complete message (both delimiters + valid content)
		if (combinedText && hasCompleteEncodedMessage(combinedText)) {
			console.log('[Hidenly] [X.com] ✓ Complete message found at parent level', levelsChecked + 1);
			return combinedText;
		}
		
		// Move up to parent
		currentElement = currentElement.parentElement;
		levelsChecked++;
	}
	
	// Fallback: return original node text even if incomplete
	console.warn('[Hidenly] [X.com] ⚠ No complete message found after checking all parent levels');
	return nodeText || '';
}

/**
 * Scan the entire page for hidden content - Hybrid approach: broad scan + X.com filtering
 * Uses broad TreeWalker scan to find secrets anywhere, then adds X.com-specific
 * filtering and aggregation to handle split text nodes on that platform.
 */
function scanPageForHiddenContent() {
	const detectedElements = [];
	const processedElements = new Set(); // Track processed elements to avoid duplicates
	const processedTweetContainers = new Set(); // Track processed tweet containers to avoid duplicates
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
	
	// Check if we're on X.com
	const hostname = window.location.hostname.toLowerCase();
	const isXCom = hostname === 'x.com' || hostname === 'twitter.com' || 
	               hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com');

	let textNode;
	while ((textNode = walker.nextNode())) {
		let text = textNode.data || '';

		// Quick skip for performance
		if (!hasInvisibleChars(text)) continue;

		// For x.com: only consider text inside a tweetText container
		const tweetContainer = textNode.parentElement?.closest('[data-testid="tweetText"]');
		if (isXCom && !tweetContainer) {
			// Skip non-tweet text on X.com
			continue;
		}
		
		if (tweetContainer) {
			// Skip if we already processed this tweet container
			if (processedTweetContainers.has(tweetContainer)) continue;
			processedTweetContainers.add(tweetContainer);
			
			// Aggregate full tweet text to handle splits
			let fullText = '';
			const tweetWalker = document.createTreeWalker(tweetContainer, NodeFilter.SHOW_TEXT, null);
			let tweetNode;
			while ((tweetNode = tweetWalker.nextNode())) {
				fullText += tweetNode.data || '';
			}
			text = fullText;

			console.log('[Hidenly] [X.com] Aggregated tweet text:', text.substring(0, 100) + '...');
		}

		if (hasCompleteEncodedMessage(text) && isLikelyHidenlyMessage(text)) {
			const element = textNode.parentElement || tweetContainer;
			if (element && !processedElements.has(element)) {
				detectedElements.push({
					element: element,
					text: text,  // Use aggregated text for x.com
					location: getElementLocation(element)
				});

				processedElements.add(element);
				console.log('[Hidenly] ✓ Detected hidden message!');
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

	// Update total count
	totalDetectedCount = results.length;

	if (results.length > 0) {
		console.log(`[Hidenly] Found ${results.length} elements with hidden content`);

		// Notify background script
		chrome.runtime.sendMessage({
			type: 'HIDDEN_CONTENT_FOUND',
			count: results.length,
			url: window.location.href,
			results: results.map((r) => ({
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
			results: results.map((r) => ({
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

/**
 * Social Media Feed Detection
 * Common selectors for popular social media platforms
 */
const FEED_SELECTORS = [
	// Twitter/X
	'[data-testid="cellInnerDiv"]',
	'[data-testid="tweet"]',
	'article[data-testid="tweet"]',
	// Facebook
	'[role="article"]',
	'[data-pagelet*="FeedUnit"]',
	'.userContentWrapper',
	// LinkedIn
	'.feed-shared-update-v2',
	'.occludable-update',
	// Instagram
	'article[role="presentation"]',
	// Reddit
	'.Post',
	'[data-testid="post-container"]',
	// TikTok
	'[data-e2e="recommend-list-item-container"]',
	// Generic feed containers
	'[role="feed"]',
	'.feed',
	'.timeline',
	'.stream'
];

/**
 * Detect if current site is a social media platform
 */
function isSocialMediaSite() {
	const hostname = window.location.hostname.toLowerCase();
	const socialDomains = [
		'twitter.com',
		'x.com',
		'facebook.com',
		'fb.com',
		'linkedin.com',
		'instagram.com',
		'reddit.com',
		'tiktok.com',
		'threads.net',
		'mastodon'
	];

	return socialDomains.some((domain) => hostname.includes(domain));
}

/**
 * Get appropriate debounce delay based on context
 */
function getDebounceDelay() {
	// Faster scanning for social media feeds
	if (isSocialMediaSite()) {
		return 500; // 500ms for social media
	}
	return 1000; // 1000ms for regular sites
}

/**
 * Check if a node is within a feed container
 */
function isInFeedContainer(node) {
	if (!node || !node.parentElement) return false;

	// Check if node or any parent matches feed selectors
	let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

	while (element && element !== document.body) {
		for (const selector of FEED_SELECTORS) {
			try {
				if (element.matches && element.matches(selector)) {
					return true;
				}
			} catch (e) {
				// Invalid selector, skip
			}
		}
		element = element.parentElement;
	}

	return false;
}

/**
 * Scan only new nodes for performance optimization - Hybrid approach
 */
function scanNewNodes(nodes) {
	const detectedElements = [];
	const processedElements = new Set(); // Track processed elements to avoid duplicates
	const processedTweetContainers = new Set(); // Track processed tweet containers to avoid duplicates
	
	// Check if we're on X.com
	const hostname = window.location.hostname.toLowerCase();
	const isXCom = hostname === 'x.com' || hostname === 'twitter.com' || 
	               hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com');

	for (const node of nodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			let text = node.data || node.nodeValue || '';
			
			// Quick skip for performance
			if (!hasInvisibleChars(text)) continue;

			// For x.com: only consider text inside a tweetText container
			const tweetContainer = node.parentElement?.closest('[data-testid="tweetText"]');
			if (isXCom && !tweetContainer) {
				// Skip non-tweet text on X.com
				continue;
			}
			
			if (tweetContainer) {
				// Skip if we already processed this tweet container
				if (processedTweetContainers.has(tweetContainer)) continue;
				processedTweetContainers.add(tweetContainer);
				
				// Aggregate full tweet text to handle splits
				let fullText = '';
				const tweetWalker = document.createTreeWalker(tweetContainer, NodeFilter.SHOW_TEXT, null);
				let tweetNode;
				while ((tweetNode = tweetWalker.nextNode())) {
					fullText += tweetNode.data || '';
				}
				text = fullText;
			}

			if (hasCompleteEncodedMessage(text) && isLikelyHidenlyMessage(text)) {
				const element = node.parentElement || tweetContainer;
				if (element && !processedElements.has(element)) {
					detectedElements.push({
						element: element,
						text: text, // Use aggregated text for x.com
						location: getElementLocation(element)
					});
					
					processedElements.add(element);
				}
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			// Recursively check text nodes within the element
			const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);

			let textNode;
			while ((textNode = walker.nextNode())) {
				let text = textNode.data || textNode.nodeValue || '';
				
				// Quick skip for performance
				if (!hasInvisibleChars(text)) continue;

				// For x.com: only consider text inside a tweetText container
				const tweetContainer = textNode.parentElement?.closest('[data-testid="tweetText"]');
				if (isXCom && !tweetContainer) {
					// Skip non-tweet text on X.com
					continue;
				}
				
				if (tweetContainer) {
					// Skip if we already processed this tweet container
					if (processedTweetContainers.has(tweetContainer)) continue;
					processedTweetContainers.add(tweetContainer);
					
					// Aggregate full tweet text to handle splits
					let fullText = '';
					const tweetWalker = document.createTreeWalker(tweetContainer, NodeFilter.SHOW_TEXT, null);
					let tweetNode;
					while ((tweetNode = tweetWalker.nextNode())) {
						fullText += tweetNode.data || '';
					}
					text = fullText;
				}

				if (hasCompleteEncodedMessage(text) && isLikelyHidenlyMessage(text)) {
					const element = textNode.parentElement || tweetContainer;
					if (element && !processedElements.has(element)) {
						detectedElements.push({
							element: element,
							text: text, // Use aggregated text for x.com
							location: getElementLocation(element)
						});
						
						processedElements.add(element);
					}
				}
			}
		}
	}

	return detectedElements;
}

/**
 * Update badge count with new findings
 */
let totalDetectedCount = 0;

function updateDetectedCount(newCount) {
	totalDetectedCount += newCount;

	if (totalDetectedCount > 0) {
		chrome.runtime.sendMessage({
			type: 'UPDATE_BADGE',
			count: totalDetectedCount
		});
	}
}

// Run initial scan when content script loads
performInitialScan();

// Set up a mutation observer to detect dynamically added content
const observer = new MutationObserver((mutations) => {
	let shouldRescan = false;
	let priorityScan = false;
	const nodesToScan = [];

	for (const mutation of mutations) {
		if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
			// Check if any added nodes contain text
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
					shouldRescan = true;
					nodesToScan.push(node);

					// Priority scan if node is in a feed container
					if (isInFeedContainer(node)) {
						priorityScan = true;
					}
				}
			}
		}
	}

	if (shouldRescan) {
		// Clear existing timeout
		if (window.hidenlyScanTimeout) {
			clearTimeout(window.hidenlyScanTimeout);
		}

		// Use faster debounce for priority scans (feed content)
		const delay = priorityScan
			? Math.min(getDebounceDelay(), PRIORITY_SCAN_MIN_DELAY)
			: getDebounceDelay();

		window.hidenlyScanTimeout = setTimeout(() => {
			// For performance, scan only new nodes first
			if (nodesToScan.length > 0 && nodesToScan.length < INCREMENTAL_SCAN_THRESHOLD) {
				const newDetections = scanNewNodes(nodesToScan);
				if (newDetections.length > 0) {
					console.log(
						`[Hidenly] Found ${newDetections.length} new elements with hidden content in feed`
					);
					updateDetectedCount(newDetections.length);

					// Notify with incremental results
					chrome.runtime.sendMessage({
						type: 'HIDDEN_CONTENT_FOUND',
						count: totalDetectedCount,
						url: window.location.href,
						results: newDetections.map((r) => ({
							text: r.text,
							location: r.location
						}))
					});
				}
			} else {
				// Full rescan for major changes
				performInitialScan();
			}
		}, delay);
	}
});

// Start observing the document
observer.observe(document.body, {
	childList: true,
	subtree: true
});

// For social media sites, also set up periodic scanning for feed updates
if (isSocialMediaSite()) {
	console.log('[Hidenly] Social media site detected - enabling enhanced feed monitoring');

	// Periodic scan to catch any missed mutations (e.g., from infinite scroll)
	setInterval(() => {
		performInitialScan();
	}, PERIODIC_SCAN_INTERVAL);
}

console.log('[Hidenly] Content script loaded and monitoring for hidden content');
