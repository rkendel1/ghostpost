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
		highlightedElements.forEach(element => {
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

	// Function to reveal a single message by opening decode page
	function revealSingleMessage(encodedText, element, itemElement, revealBtn) {
		// Extract the encoded text from the element
		const encodedMessage = encodeURIComponent(encodedText);
		const decodeUrl = `${DECODE_API_URL}?text=${encodedMessage}`;
		
		// Open in a smaller window positioned near the button
		const windowFeatures = 'width=600,height=500,left=100,top=100';
		const decodeWindow = window.open(decodeUrl, '_blank', windowFeatures);
		
		if (decodeWindow) {
			// Update UI to show it's been revealed
			revealBtn.style.display = 'none';
			itemElement.innerHTML = `
				<div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981; margin-top: 10px;">
					<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
						<span style="font-size: 20px;">✅</span>
						<span style="font-weight: 600; color: #059669;">Opening decoder...</span>
					</div>
					<p style="font-size: 13px; color: #065f46; margin: 0;">The secret will be revealed in the new window.</p>
					<button class="close-reveal-status" style="margin-top: 10px; padding: 6px 12px; background: #059669; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">OK</button>
				</div>
			`;
			
			// Add event listener for the OK button
			setTimeout(() => {
				const okButton = itemElement.querySelector('.close-reveal-status');
				if (okButton) {
					okButton.onclick = function() {
						this.parentElement.remove();
						revealBtn.style.display = 'inline-flex';
					};
				}
			}, 0);
			
			// Flash the element on page to indicate which one was revealed
			highlightElement(element);
			setTimeout(() => {
				element.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
			}, 300);
		} else {
			// Popup was blocked
			showNotification('Please allow popups to reveal messages', 'error');
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
		hiddenMessages.forEach(node => {
			const element = node.parentElement;
			if (element) highlightElement(element);
		});

		// Create modal
		const modal = document.createElement('div');
		modal.id = 'ghostpost-reveal-modal';
		modal.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 90%;
			max-width: 600px;
			max-height: 80vh;
			background: white;
			border-radius: 12px;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
			z-index: 1000000;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			display: flex;
			flex-direction: column;
			animation: modalSlideIn 0.3s ease;
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
			background: rgba(0, 0, 0, 0.5);
			z-index: 999999;
			animation: fadeIn 0.3s ease;
		`;

		// Modal header
		const header = document.createElement('div');
		header.style.cssText = `
			padding: 20px;
			border-bottom: 1px solid #e5e7eb;
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;
		header.innerHTML = `
			<div>
				<h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
					<span style="font-size: 24px;">👻</span> Hidden Messages Found
				</h2>
				<p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
					Found ${hiddenMessages.length} message${hiddenMessages.length > 1 ? 's' : ''} on this page
				</p>
			</div>
			<button id="ghostpost-close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">×</button>
		`;

		// Modal content
		const content = document.createElement('div');
		content.style.cssText = `
			padding: 20px;
			overflow-y: auto;
			flex: 1;
		`;

		// Add message items
		hiddenMessages.forEach((node, index) => {
			const element = node.parentElement;
			if (!element) return;

			const { location, visibleText } = getElementDescription(element);
			
			const item = document.createElement('div');
			item.style.cssText = `
				margin-bottom: 15px;
				padding: 15px;
				border: 1px solid #e5e7eb;
				border-radius: 8px;
				background: #f9fafb;
			`;

			item.innerHTML = `
				<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
					<div style="flex: 1;">
						<div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">
							<strong>Location:</strong> ${escapeHtml(location)}
						</div>
						<div style="font-size: 13px; color: #374151; font-family: monospace; background: white; padding: 8px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis;">
							${escapeHtml(visibleText)}
						</div>
					</div>
				</div>
				<div style="display: flex; gap: 8px;">
					<button class="reveal-btn" data-index="${index}" style="flex: 1; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.2s;">
						<span>🔓</span>
						<span>Reveal Secret</span>
					</button>
					<button class="locate-btn" data-index="${index}" style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
						<span>📍</span>
						<span>Locate</span>
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
			@keyframes modalSlideIn {
				from {
					opacity: 0;
					transform: translate(-50%, -45%);
				}
				to {
					opacity: 1;
					transform: translate(-50%, -50%);
				}
			}
			@keyframes modalSlideOut {
				from {
					opacity: 1;
					transform: translate(-50%, -50%);
				}
				to {
					opacity: 0;
					transform: translate(-50%, -45%);
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
				background: #f3f4f6;
			}
			.reveal-btn:hover {
				background: #5568d3;
			}
			.locate-btn:hover {
				background: #e5e7eb;
				border-color: #9ca3af;
			}
		`;
		document.head.appendChild(style);

		// Add to page
		document.body.appendChild(backdrop);
		document.body.appendChild(modal);

		// Close button handler
		const closeModal = () => {
			modal.style.animation = 'modalSlideOut 0.2s ease';
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
		modal.querySelectorAll('.reveal-btn').forEach(btn => {
			btn.onclick = function() {
				const index = parseInt(this.dataset.index, 10);
				const node = hiddenMessages[index];
				const element = node.parentElement;
				const encodedText = element.textContent;
				const contentDiv = this.parentElement.nextElementSibling;
				
				// Reveal the message
				revealSingleMessage(encodedText, element, contentDiv, this);
			};
		});

		// Locate button handlers
		modal.querySelectorAll('.locate-btn').forEach(btn => {
			btn.onclick = function() {
				const index = parseInt(this.dataset.index, 10);
				const node = hiddenMessages[index];
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
