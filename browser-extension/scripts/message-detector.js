/**
 * Ghostpost Message Detector
 * Auto-detects hidden messages on web pages using DOM walking
 * Injects UI to reveal messages in-place
 */

// Import from shared utilities
importScripts('../utils/dom-walker.js');
importScripts('../utils/decoding.js');

class MessageDetector {
	constructor() {
		this.detectedMessages = new Map();
		this.injectedUIs = new Map();
		this.highlightedElements = new Map();
		this.isInitialized = false;
	}

	init() {
		if (this.isInitialized) return;
		this.isInitialized = true;

		// Initial scan
		this.scanPage();

		// Watch for new messages on infinite-scroll sites
		this.setupWatcher();

		// Listen for messages from background script
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			if (request.action === 'scanPage') {
				this.scanPage();
				sendResponse({ success: true, count: this.detectedMessages.size });
			} else if (request.action === 'getMessages') {
				sendResponse({ messages: Array.from(this.detectedMessages.values()) });
			} else if (request.action === 'highlightMessage') {
				this.highlightMessage(request.elementId);
				sendResponse({ success: true });
			} else if (request.action === 'revealMessage') {
				this.revealMessage(request.elementId);
				sendResponse({ success: true });
			}
		});
	}

	scanPage() {
		// Find new messages that haven't been detected yet
		const messages = findPlatformSpecificMessages();

		messages.forEach((msg, index) => {
			const elementId = `ghostpost-msg-${Date.now()}-${index}`;

			// Mark element for tracking
			msg.element.id = elementId;

			// Store message data
			this.detectedMessages.set(elementId, {
				...msg,
				elementId,
				detected: new Date().toISOString()
			});

			// Inject reveal UI
			this.injectRevealUI(elementId, msg);
		});

		console.log(`[Ghostpost] Found ${messages.length} hidden messages`);
	}

	injectRevealUI(elementId, message) {
		if (this.injectedUIs.has(elementId)) return;

		const container = document.createElement('div');
		container.id = `ghostpost-reveal-${elementId}`;
		container.className = 'ghostpost-reveal-container';
		container.style.cssText = `
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			border: 2px solid #667eea;
			border-radius: 8px;
			padding: 12px 16px;
			margin: 8px 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			font-size: 14px;
			color: white;
			cursor: pointer;
			transition: all 0.3s ease;
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 12px;
		`;

		// Content
		const content = document.createElement('div');
		content.style.cssText = 'flex: 1;';
		content.innerHTML = `
			<div style="font-weight: 600; margin-bottom: 4px;">👻 Ghostpost Secret Found</div>
			<div style="font-size: 12px; opacity: 0.9;">${message.context || 'Hidden Message'}</div>
		`;

		// Buttons
		const buttons = document.createElement('div');
		buttons.style.cssText = 'display: flex; gap: 8px;';

		const revealBtn = document.createElement('button');
		revealBtn.textContent = '🔓 Reveal';
		revealBtn.style.cssText = `
			background: rgba(255, 255, 255, 0.2);
			border: 1px solid rgba(255, 255, 255, 0.5);
			color: white;
			padding: 6px 12px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
			font-weight: 500;
			transition: all 0.2s;
		`;
		revealBtn.onmouseover = () => (revealBtn.style.background = 'rgba(255, 255, 255, 0.3)');
		revealBtn.onmouseout = () => (revealBtn.style.background = 'rgba(255, 255, 255, 0.2)');
		revealBtn.onclick = (e) => {
			e.stopPropagation();
			this.revealMessage(elementId);
		};

		buttons.appendChild(revealBtn);

		container.appendChild(content);
		container.appendChild(buttons);

		// Insert after the message element
		const element = document.getElementById(elementId);
		if (element && element.parentNode) {
			element.parentNode.insertBefore(container, element.nextSibling);
			this.injectedUIs.set(elementId, container);
		}
	}

	highlightMessage(elementId) {
		const element = document.getElementById(elementId);
		if (!element) return;

		if (this.highlightedElements.has(elementId)) {
			// Remove highlight
			const cleanup = this.highlightedElements.get(elementId);
			cleanup();
			this.highlightedElements.delete(elementId);
		} else {
			// Add highlight
			const originalBgColor = element.style.backgroundColor;
			element.style.backgroundColor = '#FFD700';
			element.style.outline = '3px solid #FFD700';
			element.style.borderRadius = '4px';

			const cleanup = () => {
				element.style.backgroundColor = originalBgColor;
				element.style.outline = '';
				element.style.borderRadius = '';
			};

			this.highlightedElements.set(elementId, cleanup);
		}
	}

	revealMessage(elementId) {
		const message = this.detectedMessages.get(elementId);
		if (!message) return;

		// Open decode page with message
		const encodedText = encodeURIComponent(message.text);
		chrome.runtime.sendMessage(
			{
				action: 'openReveal',
				text: encodedText,
				context: message.context
			},
			(response) => {
				if (response && response.success) {
					console.log('[Ghostpost] Opened reveal page');
				}
			}
		);
	}

	setupWatcher() {
		// Watch for new messages on infinite-scroll sites
		watchForNewMessages((newMessages) => {
			newMessages.forEach((msg, index) => {
				const elementId = `ghostpost-msg-${Date.now()}-${index}`;
				msg.element.id = elementId;
				this.detectedMessages.set(elementId, {
					...msg,
					elementId,
					detected: new Date().toISOString()
				});
				this.injectRevealUI(elementId, msg);
			});

			// Notify background script
			chrome.runtime.sendMessage({
				action: 'messagesFound',
				count: this.detectedMessages.size
			});
		});
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		const detector = new MessageDetector();
		detector.init();
		window.ghostpostDetector = detector;
	});
} else {
	const detector = new MessageDetector();
	detector.init();
	window.ghostpostDetector = detector;
}
