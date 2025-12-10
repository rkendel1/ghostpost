// ==UserScript==
// @name         Ghostpost Reveal
// @namespace    https://ghostpost-six.vercel.app
// @version      1.2.0
// @description  Reveal hidden Ghostpost messages on any webpage with one click
// @author       Ghostpost
// @match        *://*/*
// @exclude      *://*/login*
// @exclude      *://*/signin*
// @exclude      *://*/banking*
// @exclude      *://*/account*
// @exclude      *://*.bank.*/*
// @exclude      *://*.paypal.*/*
// @grant        none
// @updateURL    https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// @downloadURL  https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// ==/UserScript==

/**
 * Ghostpost Reveal Userscript
 *
 * Performance Optimizations:
 * - Debouncing: 2 second delay after page changes before scanning
 * - Scan timeouts: 100ms maximum for any single scan operation
 * - Node limits: 1000 nodes maximum per scan to prevent browser freezing
 * - Quick pre-checks: Fast indexOf checks before expensive regex matching
 * - Large text rejection: Skips text nodes over 50KB to avoid performance issues
 * - Micro-pulsing: Faster, subtler pulse animation (1.5s) for social media feeds
 *
 * Security & Privacy Notes:
 * - All processing happens locally in your browser
 * - No data is sent to external servers during detection
 * - Only extracts text when you explicitly click the reveal button
 * - Common sensitive domains (banking, login) are excluded
 * - Uses DOM manipulation only, no eval() or dynamic code execution
 */

(function () {
	'use strict';

	// Configuration
	const DECODE_API_URL = 'https://ghostpost-six.vercel.app/decode';
	const BUTTON_ID = 'ghostpost-reveal-button';

	// Check if button already exists
	if (document.getElementById(BUTTON_ID)) {
		return;
	}

	// Create floating reveal button using DOM methods for security
	const button = document.createElement('div');
	button.id = BUTTON_ID;

	const container = document.createElement('div');
	container.style.cssText = 'position: relative; width: 100%; height: 100%;';

	const ghost = document.createElement('span');
	ghost.textContent = '👻';
	ghost.style.fontSize = '32px';

	const counter = document.createElement('span');
	counter.id = 'ghostpost-counter';
	counter.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        font-weight: bold;
        display: none;
        align-items: center;
        justify-content: center;
    `;

	container.appendChild(ghost);
	container.appendChild(counter);
	button.appendChild(container);

	button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

	// Hover effect
	button.onmouseenter = () => {
		button.style.transform = 'scale(1.1)';
		button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
	};
	button.onmouseleave = () => {
		button.style.transform = 'scale(1)';
		button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
	};

	// Performance optimization constants
	const DEBOUNCE_DELAY = 2000; // Wait 2 seconds after last change before scanning
	const MAX_TEXT_NODE_LENGTH = 50000; // Skip very large text nodes
	const MAX_NODES_PER_SCAN = 1000; // Limit nodes scanned in one pass
	const SCAN_TIMEOUT = 100; // Maximum time for a single scan in ms

	// List of invisible Unicode characters used for encoding
	// Must match the encoding scheme: \u2060, \u200B, \u200C, \u200D, \u200E, \u200F, \u202D, \u202C
	// Plus \uFEFF used as delimiter
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

	// Create regex pattern to detect invisible characters
	const escapedChars = HIDENLY_CHARS.map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	const invisibleCharRegex = new RegExp(`[${escapedChars.join('')}]`, 'g');

	// Minimum threshold - Hidenly uses pairs of chars, so minimum 8 chars = ~4 base64 chars
	const MIN_INVISIBLE_CHAR_COUNT = 8;

	// Quick pre-check using indexOf for performance
	function hasInvisibleChars(text) {
		// Quick check for delimiter first (most reliable indicator)
		if (text.indexOf('\uFEFF') !== -1) return true;
		// Check for at least one of the common encoding chars
		return (
			text.indexOf('\u200B') !== -1 ||
			text.indexOf('\u200C') !== -1 ||
			text.indexOf('\u200D') !== -1 ||
			text.indexOf('\u2060') !== -1 ||
			text.indexOf('\u200E') !== -1 ||
			text.indexOf('\u200F') !== -1 ||
			text.indexOf('\u202C') !== -1 ||
			text.indexOf('\u202D') !== -1
		);
	}

	/**
	 * Check if text likely contains a Hidenly encoded message
	 * Returns false for legitimate uses like RTL text support
	 * Optimized for performance
	 */
	function isLikelyHidenlyMessage(text) {
		// Skip empty or extremely long text nodes
		if (!text || text.length === 0 || text.length > MAX_TEXT_NODE_LENGTH) {
			return false;
		}

		// Quick pre-check before expensive regex
		if (!hasInvisibleChars(text)) {
			return false;
		}

		// If we have the delimiter character (FEFF), it's very likely an encoded message
		// The encoding wraps secrets with FEFF delimiters
		if (text.indexOf('\uFEFF') !== -1) {
			return true;
		}

		const matches = text.match(invisibleCharRegex);

		if (!matches || matches.length < MIN_INVISIBLE_CHAR_COUNT) {
			return false;
		}

		// Calculate ratio of invisible chars to total length
		const ratio = matches.length / text.length;

		// If there are very few invisible chars relative to text length,
		// it's likely legitimate formatting (e.g., a few RTL marks in longer text)
		if (ratio < 0.01 && matches.length < 20) {
			return false;
		}

		// If high count or high ratio, likely encoded content
		return matches.length > 30 || ratio > 0.1;
	}

	// Function to detect hidden messages with performance optimization
	function detectHiddenMessages() {
		const textNodes = [];
		const startTime = Date.now();
		let nodesChecked = 0;

		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

		let node;
		while ((node = walker.nextNode())) {
			// Safety check: stop if taking too long
			if (Date.now() - startTime > SCAN_TIMEOUT) {
				console.log(
					'[Ghostpost] Scan timeout - stopping early for performance. Checked',
					nodesChecked,
					'nodes'
				);
				break;
			}

			// Limit number of nodes processed
			if (nodesChecked >= MAX_NODES_PER_SCAN) {
				console.log(
					'[Ghostpost] Max nodes reached - stopping scan. Checked',
					nodesChecked,
					'nodes'
				);
				break;
			}

			nodesChecked++;

			if (node.textContent && isLikelyHidenlyMessage(node.textContent)) {
				textNodes.push(node);
			}
		}

		return textNodes;
	}

	// Detect if on a social media site for micro-pulsing
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

	// Function to update counter
	function updateCounter() {
		const hiddenMessages = detectHiddenMessages();
		const counter = document.getElementById('ghostpost-counter');

		if (hiddenMessages.length > 0) {
			counter.textContent = hiddenMessages.length;
			counter.style.display = 'flex';

			// Use micro-pulsing for social media feeds for better attention without being intrusive
			const useMicroPulse = isSocialMediaSite();
			const animationName = useMicroPulse ? 'micropulse' : 'pulse';
			button.style.animation = `${animationName} ${useMicroPulse ? '1.5s' : '2s'} infinite`;

			// Add pulse animations
			if (!document.getElementById('ghostpost-pulse-style')) {
				const style = document.createElement('style');
				style.id = 'ghostpost-pulse-style';
				style.textContent = `
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
                        50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6); }
                    }
                    @keyframes micropulse {
                        0%, 100% { 
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                            transform: scale(1);
                        }
                        50% { 
                            box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
                            transform: scale(1.03);
                        }
                    }
                `;
				document.head.appendChild(style);
			}
		} else {
			counter.style.display = 'none';
			button.style.animation = 'none';
		}
	}

	// Function to reveal all hidden messages
	function revealMessages() {
		const hiddenMessages = detectHiddenMessages();

		if (hiddenMessages.length === 0) {
			showNotification('No hidden messages found on this page', 'info');
			return;
		}

		// Extract text from nodes containing hidden messages only
		let extractedText = '';
		hiddenMessages.forEach((node) => {
			// Get parent element text to include context
			const parent = node.parentElement;
			if (parent) {
				extractedText += parent.innerText + '\n\n';
			}
		});

		// Limit text size to prevent URL length issues (max ~8KB)
		const maxLength = 8000;
		if (extractedText.length > maxLength) {
			extractedText = extractedText.substring(0, maxLength);
			showNotification(
				'Note: Text truncated due to size. Some messages may not be included.',
				'info'
			);
		}

		// Open decode page with the text
		const encodedText = encodeURIComponent(extractedText);
		const decodeUrl = `${DECODE_API_URL}?text=${encodedText}`;

		// Open in new window
		window.open(decodeUrl, '_blank', 'width=800,height=600');

		showNotification(
			`Found ${hiddenMessages.length} hidden message(s)! Opening decoder...`,
			'success'
		);
	}

	// Function to show notification
	function showNotification(message, type = 'info') {
		const notification = document.createElement('div');
		notification.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
		notification.textContent = message;

		document.body.appendChild(notification);

		setTimeout(() => {
			notification.style.animation = 'slideOut 0.3s ease';
			setTimeout(() => notification.remove(), 300);
		}, 3000);
	}

	// Click handler
	button.onclick = revealMessages;

	// Add button to page
	document.body.appendChild(button);

	// Initial counter update (debounced to let page load)
	setTimeout(updateCounter, 1000);

	// Debounced update function to prevent excessive scanning
	let debounceTimeout;
	function debouncedUpdateCounter() {
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(updateCounter, DEBOUNCE_DELAY);
	}

	// Monitor for dynamic content changes with debouncing
	const observer = new MutationObserver((mutations) => {
		// Only update if there are actual content changes
		let hasContentChange = false;
		for (const mutation of mutations) {
			if (
				mutation.type === 'characterData' ||
				(mutation.type === 'childList' && mutation.addedNodes.length > 0)
			) {
				hasContentChange = true;
				break;
			}
		}

		if (hasContentChange) {
			debouncedUpdateCounter();
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true
	});

	console.log(
		'Ghostpost Reveal extension loaded! Click the 👻 button to reveal hidden messages. Scanning is optimized for performance.'
	);
})();
