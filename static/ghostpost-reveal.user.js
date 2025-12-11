// ==UserScript==
// @name         Ghostpost Reveal
// @namespace    https://ghostpost-six.vercel.app
// @version      2.1.3
// @description  Reveal hidden Ghostpost messages on any webpage with one click - now with inline decoding!
// @author       Ghostpost
// @match        *://*/*
// @exclude      *://*/login*
// @exclude      *://*/signin*
// @exclude      *://*/banking*
// @exclude      *://*/account*
// @exclude      *://*.bank.*/*
// @exclude      *://*.paypal.*/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js#sha512-ao+909PCNAe2ioXJCM/z62rT8g1nCdUhtyWz1jL7UlcN2ysLjNAz3OTWwSTd67QqYyj9VCZe9/8Zxqhxh3C0aA==
// @updateURL    https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// @downloadURL  https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// ==/UserScript==

/**
 * Ghostpost Reveal Userscript
 *
 * CHANGELOG:
 * ==========
 * v2.1.3 (2025-12-11):
 * - CRITICAL FIX: Added decompression support for encoded messages
 * - Now properly decodes compressed secrets using pako.js DEFLATE
 * - Fixes garbled text issue when revealing secrets
 * - Backward compatible with legacy uncompressed messages
 *
 * v2.1.2 (2025-12-11):
 * - MOBILE FIX: Made overlay modal responsive for better mobile viewing
 * - Modal width now adapts to screen size (screen width - 40px, max 400px)
 * - Ensures 20px margin on each side for better mobile web experience
 *
 * v2.1.1 (2025-12-11):
 * - CODE QUALITY: Extracted common text extraction logic to reduce duplication
 * - Added DEBUG_MODE flag to control console logging in production
 * - Improved maintainability of site adapter system
 * - Cleaner code structure per review feedback
 *
 * v2.1.0 (2025-12-11):
 * - ARCHITECTURE: Compartmentalized site-specific detection logic
 * - Added SITE_ADAPTERS system for site-specific text extraction strategies
 * - Core detection logic is now site-agnostic and isolated
 * - Site-specific requirements handled via adapter pattern
 * - Easy to add new site-specific handlers without touching core code
 * - Improved maintainability and testability
 *
 * v2.0.3 (2025-12-11):
 * - FIXED: X.com/Twitter decode failures - "No hidden content found" error
 * - Changed detectHiddenMessages() to use node.data instead of node.textContent
 * - Store encoded text at detection time to prevent Unicode character loss
 * - Detection now returns {node, encodedText} objects for reliable decoding
 * - Better preservation of invisible Unicode characters on dynamic DOM platforms
 *
 * v2.0.2:
 * - Fixed X.com/Twitter decode issue: Now uses text node content directly instead of element.textContent
 * - This preserves invisible Unicode characters that may be lost when accessing parent element content
 * - Fixes "No hidden content found" error on X.com and similar platforms
 *
 * v2.0.1:
 * - Version bump to force auto-update in userscript managers
 * - Ensures all users get the inline modal experience
 *
 * v2.0.0 Features:
 * - Inline decoding: No more redirects! Secrets are revealed directly in the modal
 * - Compact modal: Positioned above the ghost button for better UX
 * - Three-step workflow: Notify → Identify → Reveal, all in one modal
 * - Client-side only: All decoding happens locally, no authentication needed
 * - Copy to clipboard: Easy sharing of revealed secrets
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
 * - No data is sent to external servers during detection or decoding
 * - No authentication required to decode messages
 * - Common sensitive domains (banking, login) are excluded
 * - Uses DOM manipulation only, no eval() or dynamic code execution
 */

(function () {
	'use strict';

	// Configuration
	const BUTTON_ID = 'ghostpost-reveal-button';
	const SCRIPT_VERSION = '2.1.3';
	const DEBUG_MODE = false; // Set to true for verbose logging

	/**
	 * Dynamically load pako.js for DEFLATE decompression if not already loaded
	 * Returns a promise that resolves when pako is ready
	 */
	async function ensurePako() {
		if (typeof pako !== 'undefined') {
			return;
		}

		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
			script.integrity = 'sha512-ao+909PCNAe2ioXJCM/z62rT8g1nCdUhtyWz1jL7UlcN2ysLjNAz3OTWwSTd67QqYyj9VCZe9/8Zxqhxh3C0aA==';
			script.crossOrigin = 'anonymous';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load pako.js'));
			document.head.appendChild(script);
		});
	}

	// Check if button already exists (might be from an old version)
	const existingButton = document.getElementById(BUTTON_ID);
	if (existingButton) {
		// Check if this is an old version by looking for the data-version attribute
		const existingVersion = existingButton.dataset.version;
		if (existingVersion && existingVersion !== SCRIPT_VERSION) {
			console.warn(
				`[Ghostpost] Detected old version ${existingVersion}. Current version is ${SCRIPT_VERSION}. Please update your userscript.`
			);
			existingButton.remove(); // Remove old button
		} else {
			// Same version already running, don't load again
			return;
		}
	}

	// Create floating reveal button using DOM methods for security
	const button = document.createElement('div');
	button.id = BUTTON_ID;
	button.dataset.version = SCRIPT_VERSION; // Store version for future compatibility checks

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
	 * Check if text likely contains a Ghostpost encoded message
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

	/**
	 * Default text extraction strategy that preserves invisible Unicode characters
	 * This works well for most sites including X.com/Twitter
	 */
	const defaultTextExtraction = (node) => node.data || node.nodeValue || node.textContent || '';

	/**
	 * Twitter/X.com adapter - shared between x.com and twitter.com
	 */
	const twitterAdapter = {
		extractText: defaultTextExtraction,
		description: 'Uses node.data to preserve invisible Unicode characters'
	};

	/**
	 * Site-specific text extraction strategies
	 * Each site can define how to best extract text from nodes
	 * 
	 * TO ADD A NEW SITE:
	 * Simply add a new entry with the domain as key and an adapter object:
	 * 'example.com': {
	 *   extractText: (node) => { custom logic here },
	 *   description: 'Brief explanation of the strategy'
	 * }
	 */
	const SITE_ADAPTERS = {
		// X.com/Twitter - uses shared adapter
		'x.com': twitterAdapter,
		'twitter.com': twitterAdapter,
		// Default strategy for all other sites
		'default': {
			extractText: defaultTextExtraction,
			description: 'Standard text extraction with Unicode preservation'
		}
	};

	/**
	 * Get the appropriate site adapter based on current hostname
	 */
	function getSiteAdapter() {
		const hostname = window.location.hostname.toLowerCase();
		
		// Check for exact match (e.g., 'x.com', 'twitter.com')
		if (SITE_ADAPTERS[hostname]) {
			if (DEBUG_MODE) {
				console.log(`[Ghostpost] Using site-specific adapter for ${hostname}`);
			}
			return SITE_ADAPTERS[hostname];
		}
		
		// Check for subdomain match (e.g., 'mobile.twitter.com' matches 'twitter.com')
		// Note: hostname.endsWith('.' + domain) ensures proper subdomain matching
		// For example: 'mobile.twitter.com'.endsWith('.twitter.com') = true
		//              but 'badtwitter.com'.endsWith('.twitter.com') = false
		for (const domain in SITE_ADAPTERS) {
			if (domain !== 'default' && hostname.endsWith('.' + domain)) {
				if (DEBUG_MODE) {
					console.log(`[Ghostpost] Using site-specific adapter for ${domain}`);
				}
				return SITE_ADAPTERS[domain];
			}
		}
		
		// Fall back to default
		if (DEBUG_MODE) {
			console.log('[Ghostpost] Using default adapter');
		}
		return SITE_ADAPTERS['default'];
	}

	/**
	 * Core detection function - site-agnostic
	 * Returns array of objects: { node, encodedText }
	 */
	function detectHiddenMessages() {
		const results = [];
		const startTime = Date.now();
		let nodesChecked = 0;

		// Get site-specific adapter
		const adapter = getSiteAdapter();

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

			// Use site-specific text extraction
			const nodeText = adapter.extractText(node);
			if (nodeText && isLikelyHidenlyMessage(nodeText)) {
				// Store both the node and the encoded text at detection time
				results.push({ node, encodedText: nodeText });
			}
		}

		return results;
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
			'threads.net'
		];

		// Check for exact match or subdomain match (e.g., www.twitter.com, mobile.twitter.com)
		const isKnownSocial = socialDomains.some((domain) => {
			return hostname === domain || hostname.endsWith('.' + domain);
		});

		// For Mastodon, check if 'mastodon' or 'mstdn' appears as a proper subdomain
		// This matches: mastodon.social, mastodon.online, social.mastodon.example, mstdn.jp
		// But rejects: evil.mastodon.fake.com, mastodon-fake.evil.com
		const parts = hostname.split('.');
		const isMastodon =
			parts[0] === 'mastodon' ||
			parts[0] === 'mstdn' ||
			(parts.length > 2 && parts[parts.length - 2] === 'mastodon');

		return isKnownSocial || isMastodon;
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

	// Store for tracking highlighted elements
	const highlightedElements = new Set();

	// Function to get element description for display
	function getElementDescription(element) {
		// Try to find a meaningful context
		const tagName = element.tagName.toLowerCase();

		// Get visible text preview (first 50 chars)
		const textContent = element.textContent.trim();
		let visibleText = textContent.substring(0, 50);
		if (textContent.length > 50) visibleText += '...';

		// Get location context
		let location = tagName;
		if (element.id) location = `#${element.id}`;
		else if (element.className) {
			const classes = element.className.split(' ').slice(0, 2).join('.');
			if (classes) location = `.${classes}`;
		}

		return { location, visibleText };
	}

	// Function to highlight element on the page
	function highlightElement(element) {
		if (highlightedElements.has(element)) return;

		element.style.outline = '3px solid #ef4444';
		element.style.outlineOffset = '2px';
		element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
		element.style.transition = 'all 0.3s ease';
		highlightedElements.add(element);
	}

	// Function to remove highlight from element
	function removeHighlight(element) {
		element.style.outline = '';
		element.style.outlineOffset = '';
		element.style.backgroundColor = '';
		highlightedElements.delete(element);
	}

	// Function to remove all highlights
	function removeAllHighlights() {
		highlightedElements.forEach((element) => {
			element.style.outline = '';
			element.style.outlineOffset = '';
			element.style.backgroundColor = '';
		});
		highlightedElements.clear();
	}

	// Function to scroll element into view smoothly
	function scrollToElement(element) {
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	// Base64 character map for decoding
	const BASE64_CHAR_MAP = {
		'\u2060\u2060': 'A',
		'\u2060\u200B': 'B',
		'\u2060\u200C': 'C',
		'\u2060\u200D': 'D',
		'\u2060\u200E': 'E',
		'\u2060\u200F': 'F',
		'\u2060\u202D': 'G',
		'\u2060\u202C': 'H',
		'\u200B\u2060': 'I',
		'\u200B\u200B': 'J',
		'\u200B\u200C': 'K',
		'\u200B\u200D': 'L',
		'\u200B\u200E': 'M',
		'\u200B\u200F': 'N',
		'\u200B\u202D': 'O',
		'\u200B\u202C': 'P',
		'\u200C\u2060': 'Q',
		'\u200C\u200B': 'R',
		'\u200C\u200C': 'S',
		'\u200C\u200D': 'T',
		'\u200C\u200E': 'U',
		'\u200C\u200F': 'V',
		'\u200C\u202D': 'W',
		'\u200C\u202C': 'X',
		'\u200D\u2060': 'Y',
		'\u200D\u200B': 'Z',
		'\u200D\u200C': 'a',
		'\u200D\u200D': 'b',
		'\u200D\u200E': 'c',
		'\u200D\u200F': 'd',
		'\u200D\u202D': 'e',
		'\u200D\u202C': 'f',
		'\u200E\u2060': 'g',
		'\u200E\u200B': 'h',
		'\u200E\u200C': 'i',
		'\u200E\u200D': 'j',
		'\u200E\u200E': 'k',
		'\u200E\u200F': 'l',
		'\u200E\u202D': 'm',
		'\u200E\u202C': 'n',
		'\u200F\u2060': 'o',
		'\u200F\u200B': 'p',
		'\u200F\u200C': 'q',
		'\u200F\u200D': 'r',
		'\u200F\u200E': 's',
		'\u200F\u200F': 't',
		'\u200F\u202D': 'u',
		'\u200F\u202C': 'v',
		'\u202D\u2060': 'w',
		'\u202D\u200B': 'x',
		'\u202D\u200C': 'y',
		'\u202D\u200D': 'z',
		'\u202D\u200E': '0',
		'\u202D\u200F': '1',
		'\u202D\u202D': '2',
		'\u202D\u202C': '3',
		'\u202C\u2060': '4',
		'\u202C\u200B': '5',
		'\u202C\u200C': '6',
		'\u202C\u200D': '7',
		'\u202C\u200E': '8',
		'\u202C\u200F': '9',
		'\u202C\u202D': '+',
		'\u202C\u202C': '/'
	};

	// Delimiter used in encoding
	const POST_ID_DELIMITER = '||ghostid:';
	const POST_ID_END = '||';

	/**
	 * Decode a hidden message from encoded text (client-side implementation)
	 * Now supports DEFLATE decompression for compressed messages
	 */
	async function decodeHiddenMessage(encodedText) {
		try {
			// Ensure pako is loaded
			await ensurePako();

			// Extract content between delimiters (FEFF characters)
			const parts = encodedText.split('\uFEFF');
			if (parts.length < 2) {
				throw new Error('No hidden content found');
			}

			const unwrapped = parts[1];
			if (!unwrapped || unwrapped.length === 0) {
				throw new Error('Empty hidden content');
			}

			// Convert pairs of invisible chars back to base64
			let base64String = '';
			for (let i = 0; i < unwrapped.length; i += 2) {
				if (i + 1 < unwrapped.length) {
					const pair = unwrapped[i] + unwrapped[i + 1];
					const base64Char = BASE64_CHAR_MAP[pair];
					if (base64Char) {
						base64String += base64Char;
					}
				}
			}

			if (!base64String) {
				throw new Error('Invalid encoded content');
			}

			// Decode base64 to get the compressed/uncompressed bytes
			let decodedBytes;
			try {
				decodedBytes = atob(base64String);
			} catch (e) {
				throw new Error('Invalid base64 encoding');
			}

			// Convert base64 decoded string to Uint8Array
			const byteArray = new Uint8Array(decodedBytes.length);
			for (let i = 0; i < decodedBytes.length; i++) {
				byteArray[i] = decodedBytes.charCodeAt(i);
			}

			// Try decompressing first (for new compressed messages)
			// If decompression fails, it's likely a legacy uncompressed message
			let finalBytes;
			try {
				finalBytes = pako.inflate(byteArray);
			} catch (e) {
				// Decompression failed - likely legacy uncompressed message
				if (DEBUG_MODE) {
					console.log('[Ghostpost] Decompression failed, trying uncompressed:', e);
				}
				finalBytes = byteArray;
			}

			// Decode UTF-8
			let decoded;
			try {
				decoded = new TextDecoder('utf-8').decode(finalBytes);
			} catch (e) {
				// Fallback to manual UTF-8 decode
				decoded = decodeURIComponent(
					Array.from(
						finalBytes,
						(byte) => '%' + ('00' + byte.toString(16)).slice(-2)
					).join('')
				);
			}

			// Check for post ID and strip it
			const postIdIndex = decoded.indexOf(POST_ID_DELIMITER);
			if (postIdIndex !== -1) {
				return decoded.substring(0, postIdIndex);
			}

			return decoded;
		} catch (err) {
			console.error('Decode error:', err);
			throw new Error('Failed to decode: ' + err.message);
		}
	}

	// Function to reveal a single message inline
	async function revealSingleMessage(encodedText, textNode, element, itemElement, revealBtn) {
		// Hide the reveal button
		revealBtn.style.display = 'none';

		// Show loading state
		itemElement.innerHTML = `
			<div style="padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 10px;">
				<div style="display: flex; align-items: center; gap: 10px;">
					<span style="font-size: 20px;">🔓</span>
					<span style="font-weight: 600; color: #1e40af;">Decoding secret...</span>
				</div>
			</div>
		`;

		// Decode the message (async)
		try {
			const decodedMessage = await decodeHiddenMessage(encodedText);

			// Check if it's an image
			const isImage = decodedMessage.startsWith('data:image/');

			// Show the decoded content
			if (isImage) {
				// Validate data URL format to prevent XSS
				const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
				if (!dataUrlPattern.test(decodedMessage)) {
					throw new Error('Invalid image format');
				}

				itemElement.innerHTML = `
					<div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 10px;">
						<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
							<span style="font-size: 20px;">✨</span>
							<span style="font-weight: 600; color: #059669;">Hidden Image Revealed!</span>
						</div>
						<img src="${decodedMessage}" style="max-width: 100%; border-radius: 4px; margin-top: 8px;" alt="Decoded hidden image" />
					</div>
				`;
			} else {
				const escapedMessage = escapeHtml(decodedMessage);
				itemElement.innerHTML = `
					<div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 10px;">
						<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
							<span style="font-size: 20px;">✨</span>
							<span style="font-weight: 600; color: #059669;">Secret Revealed!</span>
						</div>
						<div style="font-size: 14px; color: #065f46; background: white; padding: 10px; border-radius: 4px; margin-top: 8px; white-space: pre-wrap; word-break: break-word;">${escapedMessage}</div>
						<button class="copy-secret-btn" style="margin-top: 10px; padding: 6px 12px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
							<span>📋</span>
							<span>Copy Secret</span>
						</button>
					</div>
				`;

				// Add copy functionality
				setTimeout(() => {
					const copyBtn = itemElement.querySelector('.copy-secret-btn');
					if (copyBtn) {
						copyBtn.onclick = function () {
							// Check if clipboard API is available
							if (!navigator.clipboard || !navigator.clipboard.writeText) {
								// Fallback for browsers without clipboard API
								const textArea = document.createElement('textarea');
								textArea.value = decodedMessage;
								textArea.style.position = 'fixed';
								textArea.style.left = '-999999px';
								document.body.appendChild(textArea);
								textArea.select();
								try {
									document.execCommand('copy');
									this.innerHTML = '<span>✅</span><span>Copied!</span>';
									setTimeout(() => {
										this.innerHTML = '<span>📋</span><span>Copy Secret</span>';
									}, 2000);
								} catch (err) {
									console.error('Copy failed:', err);
									showNotification('Failed to copy to clipboard', 'error');
								}
								document.body.removeChild(textArea);
								return;
							}

							navigator.clipboard
								.writeText(decodedMessage)
								.then(() => {
									this.innerHTML = '<span>✅</span><span>Copied!</span>';
									setTimeout(() => {
										this.innerHTML = '<span>📋</span><span>Copy Secret</span>';
									}, 2000);
								})
								.catch((err) => {
									console.error('Copy failed:', err);
									showNotification('Failed to copy to clipboard', 'error');
								});
						};
					}
				}, 0);
			}

			// Flash the element on page to indicate which one was revealed
			highlightElement(element);
			setTimeout(() => {
				element.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
			}, 300);
		} catch (err) {
			// Show error
			itemElement.innerHTML = `
				<div style="padding: 15px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; margin-top: 10px;">
					<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
						<span style="font-size: 20px;">❌</span>
						<span style="font-weight: 600; color: #b91c1c;">Decoding Failed</span>
					</div>
					<p style="font-size: 13px; color: #991b1b; margin: 0;">${escapeHtml(err.message)}</p>
					<button class="retry-reveal-btn" style="margin-top: 10px; padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Try Again</button>
				</div>
			`;

			// Add retry functionality
			setTimeout(() => {
				const retryBtn = itemElement.querySelector('.retry-reveal-btn');
				if (retryBtn) {
					retryBtn.onclick = function () {
						itemElement.innerHTML = '';
						revealBtn.style.display = 'inline-flex';
					};
				}
			}, 0);
		}
	}

	// Utility function to escape HTML
	function escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// Function to create and show the reveal modal
	function showRevealModal(hiddenMessages) {
		// Remove any existing modal
		const existingModal = document.getElementById('ghostpost-reveal-modal');
		if (existingModal) {
			existingModal.remove();
		}

		// Highlight all elements with hidden messages
		hiddenMessages.forEach(({ node }) => {
			const element = node.parentElement;
			if (element) highlightElement(element);
		});

		// Calculate position above ghost button
		const ghostButton = document.getElementById(BUTTON_ID);
		const buttonRect = ghostButton.getBoundingClientRect();
		// Make modal responsive: narrower on mobile, wider on desktop
		// Use screen width minus 40px (20px margin on each side), with 400px maximum
		const modalWidth = Math.min(400, window.innerWidth - 40);
		const modalMaxHeight = Math.min(500, window.innerHeight - 120);

		// Position modal above the button, centered horizontally with it
		const modalLeft = Math.max(
			10,
			Math.min(
				window.innerWidth - modalWidth - 10,
				buttonRect.left + buttonRect.width / 2 - modalWidth / 2
			)
		);
		const modalBottom = window.innerHeight - buttonRect.top + 10; // 10px gap above button

		// Create modal
		const modal = document.createElement('div');
		modal.id = 'ghostpost-reveal-modal';
		modal.style.cssText = `
			position: fixed;
			bottom: ${modalBottom}px;
			left: ${modalLeft}px;
			width: ${modalWidth}px;
			max-height: ${modalMaxHeight}px;
			background: white;
			border-radius: 12px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			z-index: 1000000;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			display: flex;
			flex-direction: column;
			animation: modalSlideUp 0.3s ease;
		`;

		// Create backdrop
		const backdrop = document.createElement('div');
		backdrop.id = 'ghostpost-modal-backdrop';
		backdrop.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.3);
			z-index: 999999;
			animation: fadeIn 0.3s ease;
		`;

		// Modal header
		const header = document.createElement('div');
		header.style.cssText = `
			padding: 16px;
			border-bottom: 1px solid #e5e7eb;
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border-radius: 12px 12px 0 0;
		`;
		header.innerHTML = `
			<div>
				<h2 style="margin: 0; font-size: 18px; font-weight: 600; color: white;">
					<span style="font-size: 20px;">👻</span> Hidden Messages
				</h2>
				<p style="margin: 3px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.9);">
					${hiddenMessages.length} secret${hiddenMessages.length > 1 ? 's' : ''} found
				</p>
			</div>
			<button id="ghostpost-close-modal" style="background: rgba(255,255,255,0.2); border: none; font-size: 20px; cursor: pointer; color: white; padding: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;">×</button>
		`;

		// Modal content
		const content = document.createElement('div');
		content.style.cssText = `
			padding: 12px;
			overflow-y: auto;
			flex: 1;
		`;

		// Add message items
		hiddenMessages.forEach(({ node, encodedText }, index) => {
			const element = node.parentElement;
			if (!element) return;

			const { location, visibleText } = getElementDescription(element);

			const item = document.createElement('div');
			item.style.cssText = `
				margin-bottom: 12px;
				padding: 12px;
				border: 1px solid #e5e7eb;
				border-radius: 8px;
				background: #f9fafb;
			`;

			item.innerHTML = `
				<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
					<div style="flex: 1;">
						<div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
							<strong>Location:</strong> ${escapeHtml(location)}
						</div>
						<div style="font-size: 12px; color: #374151; font-family: monospace; background: white; padding: 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis;">
							${escapeHtml(visibleText)}
						</div>
					</div>
				</div>
				<div style="display: flex; gap: 6px;">
					<button class="reveal-btn" data-index="${index}" style="flex: 1; padding: 7px 12px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.2s;">
						<span>🔓</span>
						<span>Reveal</span>
					</button>
					<button class="locate-btn" data-index="${index}" style="padding: 7px 12px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s;">
						<span>📍</span>
						<span>Find</span>
					</button>
				</div>
				<div class="reveal-content"></div>
			`;

			content.appendChild(item);
		});

		modal.appendChild(header);
		modal.appendChild(content);

		// Add animations
		const style = document.createElement('style');
		style.textContent = `
			@keyframes modalSlideUp {
				from {
					opacity: 0;
					transform: translateY(20px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			@keyframes modalSlideDown {
				from {
					opacity: 1;
					transform: translateY(0);
				}
				to {
					opacity: 0;
					transform: translateY(20px);
				}
			}
			@keyframes fadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}
			@keyframes fadeOut {
				from { opacity: 1; }
				to { opacity: 0; }
			}
			#ghostpost-close-modal:hover {
				background: rgba(255,255,255,0.3) !important;
			}
			.reveal-btn:hover {
				background: #5568d3 !important;
			}
			.locate-btn:hover {
				background: #e5e7eb !important;
				border-color: #9ca3af !important;
			}
		`;
		document.head.appendChild(style);

		// Add to page
		document.body.appendChild(backdrop);
		document.body.appendChild(modal);

		// Close button handler
		const closeModal = () => {
			modal.style.animation = 'modalSlideDown 0.2s ease';
			backdrop.style.animation = 'fadeOut 0.2s ease';
			setTimeout(() => {
				modal.remove();
				backdrop.remove();
				removeAllHighlights();
			}, 200);
		};

		document.getElementById('ghostpost-close-modal').onclick = closeModal;
		backdrop.onclick = closeModal;

		// Reveal button handlers
		modal.querySelectorAll('.reveal-btn').forEach((btn) => {
			btn.onclick = async function () {
				const index = parseInt(this.dataset.index, 10);
				const { node, encodedText } = hiddenMessages[index];
				const element = node.parentElement;
				const contentDiv = this.parentElement.nextElementSibling;

				// Reveal the message using stored encodedText
				// This is critical for X.com/Twitter where re-reading may lose invisible characters
				await revealSingleMessage(encodedText, node, element, contentDiv, this);
			};
		});

		// Locate button handlers
		modal.querySelectorAll('.locate-btn').forEach((btn) => {
			btn.onclick = function () {
				const index = parseInt(this.dataset.index, 10);
				const { node } = hiddenMessages[index];
				const element = node.parentElement;

				// Scroll to element
				scrollToElement(element);

				// Flash highlight
				element.style.outline = '5px solid #ef4444';
				element.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
				setTimeout(() => {
					element.style.outline = '3px solid #ef4444';
					element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
				}, 500);
			};
		});
	}

	// Function to reveal all hidden messages
	function revealMessages() {
		const hiddenMessages = detectHiddenMessages();

		if (hiddenMessages.length === 0) {
			showNotification('No hidden messages found on this page', 'info');
			return;
		}

		// Show the reveal modal instead of opening decode page
		showRevealModal(hiddenMessages);
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
