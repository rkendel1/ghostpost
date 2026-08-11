/**
 * Prefetch Reference Module
 * Enhances the content script with intelligent reference prefetching
 *
 * Detects reference payloads in pages and prefetches content before user reveals
 * Works seamlessly with the ghostpost content delivery fabric
 */

// Invisible character detection (same as content.js)
const INVISIBLE_CHARS = [
	'​', // Zero Width Space
	'‌', // Zero Width Non-Joiner
	'‍', // Zero Width Joiner
	'‎', // Left-to-Right Mark
	'‏', // Right-to-Left Mark
	'‬', // Pop Directional Formatting
	'‭', // Left-to-Right Override
	'⁠', // Word Joiner
	'﻿'  // Zero Width No-Break Space (delimiter)
];

const INVISIBLE_CHAR_REGEX = new RegExp(`[${INVISIBLE_CHARS.join('')}]`, 'g');

// Reference cache with TTL
const referenceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class ReferencePrefetcher {
	constructor() {
		this.pendingFetches = new Map();
		this.detectionTimeout = null;
		this.isMonitoring = false;
	}

	/**
	 * Initialize the prefetcher
	 * Should be called when content script loads
	 */
	init() {
		if (this.isMonitoring) return;
		this.isMonitoring = true;

		// Start monitoring page content
		this.setupMutationObserver();

		// Perform initial scan
		this.scanPageForReferences();
	}

	/**
	 * Setup mutation observer to detect new content
	 */
	setupMutationObserver() {
		const observer = new MutationObserver((mutations) => {
			// Debounce detection to avoid excessive scanning
			clearTimeout(this.detectionTimeout);
			this.detectionTimeout = setTimeout(() => {
				this.scanPageForReferences();
			}, 500);
		});

		observer.observe(document.body, {
			childList: true,
			characterData: true,
			subtree: true,
			characterDataOldValue: false
		});
	}

	/**
	 * Scan page for reference payloads
	 */
	scanPageForReferences() {
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			null,
			false
		);

		let node;
		const references = [];

		while ((node = walker.nextNode())) {
			if (INVISIBLE_CHAR_REGEX.test(node.textContent)) {
				const refs = this.extractReferences(node.textContent);
				references.push(...refs);
			}
		}

		if (references.length > 0) {
			console.log(`🔍 Detected ${references.length} reference(s) - prefetching...`);
			this.prefetchReferences(references);
		}
	}

	/**
	 * Extract potential references from text
	 * Returns array of reference candidates for prefetch attempt
	 */
	extractReferences(text) {
		const references = [];

		// Split into lines and check each for invisible characters
		const lines = text.split(/[\r\n]/);

		for (const line of lines) {
			if (INVISIBLE_CHAR_REGEX.test(line)) {
				references.push({
					text: line.trim(),
					detected: new Date()
				});
			}
		}

		return references;
	}

	/**
	 * Prefetch references (attempt to decode and fetch content)
	 */
	async prefetchReferences(references) {
		for (const ref of references) {
			if (this.pendingFetches.has(ref.text)) {
				continue; // Already prefetching
			}

			// Mark as pending
			this.pendingFetches.set(ref.text, true);

			// Try to prefetch using messaging to background script
			try {
				const result = await this.prefetchViaMessaging(ref.text);
				if (result) {
					this.cacheReference(ref.text, result);
					console.log('✅ Prefetched reference:', result.referenceId);
				}
			} catch (error) {
				console.warn('❌ Prefetch failed:', error);
			} finally {
				this.pendingFetches.delete(ref.text);
			}
		}
	}

	/**
	 * Communicate with background script for prefetching
	 */
	async prefetchViaMessaging(encodedText) {
		return new Promise((resolve) => {
			chrome.runtime.sendMessage(
				{
					action: 'prefetchReference',
					payload: encodedText
				},
				(response) => {
					if (chrome.runtime.lastError) {
						console.warn('Messaging error:', chrome.runtime.lastError);
						resolve(null);
					} else {
						resolve(response);
					}
				}
			);
		});
	}

	/**
	 * Cache prefetched content
	 */
	cacheReference(key, content) {
		referenceCache.set(key, {
			content,
			timestamp: Date.now(),
			ttl: CACHE_TTL
		});
	}

	/**
	 * Get cached reference
	 */
	getCachedReference(key) {
		const cached = referenceCache.get(key);
		if (cached && Date.now() - cached.timestamp < cached.ttl) {
			return cached.content;
		}
		return null;
	}

	/**
	 * Clear expired cache entries
	 */
	clearExpiredCache() {
		const now = Date.now();
		for (const [key, value] of referenceCache.entries()) {
			if (now - value.timestamp >= value.ttl) {
				referenceCache.delete(key);
			}
		}
	}
}

// Initialize prefetcher when script loads
const prefetcher = new ReferencePrefetcher();

// Start monitoring when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => prefetcher.init());
} else {
	prefetcher.init();
}

// Periodic cache cleanup every minute
setInterval(() => prefetcher.clearExpiredCache(), 60000);

// Export for access from other scripts
window.ghostpostPrefetcher = prefetcher;
