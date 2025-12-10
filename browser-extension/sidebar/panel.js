/**
 * Sidebar Panel Script
 * Handles UI interactions and WASM integration for decoding
 */

// Import WASM module
import init, { decode } from '../wasm/wasm.js';

let wasmInitialized = false;

/**
 * Initialize WASM module
 */
async function initWasm() {
	if (!wasmInitialized) {
		try {
			// Fetch the WASM file as ArrayBuffer to avoid CSP issues with instantiateStreaming
			const wasmUrl = chrome.runtime.getURL('wasm/wasm_bg.wasm');
			const response = await fetch(wasmUrl);

			if (!response.ok) {
				throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
			}

			const wasmBytes = await response.arrayBuffer();
			await init({ module_or_path: wasmBytes });
			wasmInitialized = true;
			console.log('[Hidenly Sidebar] WASM initialized successfully');
		} catch (error) {
			console.error('[Hidenly Sidebar] Failed to initialize WASM:', error);
			throw error;
		}
	}
}

/**
 * Decode a message using WASM
 */
async function decodeMessage(encodedText) {
	await initWasm();
	try {
		return decode(encodedText);
	} catch (error) {
		console.error('[Hidenly Sidebar] Decode error:', error);
		throw error;
	}
}

/**
 * Tab Management
 */
class TabManager {
	constructor() {
		this.tabs = document.querySelectorAll('.tab-button');
		this.panels = document.querySelectorAll('.tab-panel');
		this.init();
	}

	init() {
		this.tabs.forEach((tab) => {
			tab.addEventListener('click', () => this.switchTab(tab));
		});
	}

	switchTab(selectedTab) {
		const targetPanel = selectedTab.dataset.tab;

		// Update tab buttons
		this.tabs.forEach((tab) => tab.classList.remove('active'));
		selectedTab.classList.add('active');

		// Update panels
		this.panels.forEach((panel) => panel.classList.remove('active'));
		document.getElementById(`${targetPanel}-panel`).classList.add('active');
	}
}

/**
 * Detection Panel Manager
 */
class DetectionPanel {
	constructor() {
		this.statusContainer = document.getElementById('status-container');
		this.messagesContainer = document.getElementById('messages-container');
		this.rescanButton = document.getElementById('rescan-button');

		this.init();
	}

	init() {
		this.rescanButton.addEventListener('click', () => this.rescanPage());
		this.loadPageData();
	}

	async loadPageData() {
		try {
			// Get data from background script
			const response = await chrome.runtime.sendMessage({ type: 'GET_TAB_DATA' });

			if (response.success && response.data) {
				this.displayStatus(response.data);
				this.displayMessages(response.data.results);
			} else {
				this.displayNoData();
			}
		} catch (error) {
			console.error('[Hidenly Sidebar] Error loading page data:', error);
			this.displayError();
		}
	}

	displayStatus(data) {
		const count = data.count || 0;

		let statusHTML;
		if (count > 0) {
			statusHTML = `
        <div class="status-badge success">
          <span>✓</span>
          <span>Hidden Content Detected</span>
        </div>
        <div class="status-info">
          <p><strong>Found:</strong> ${count} message${count > 1 ? 's' : ''}</p>
          <p><strong>URL:</strong> ${this.truncateUrl(data.url)}</p>
        </div>
      `;
		} else {
			statusHTML = `
        <div class="status-badge info">
          <span>ℹ️</span>
          <span>No Hidden Content</span>
        </div>
        <div class="status-info">
          <p>This page appears to have no hidden messages.</p>
        </div>
      `;
		}

		this.statusContainer.innerHTML = statusHTML;
	}

	displayNoData() {
		this.statusContainer.innerHTML = `
      <div class="status-badge warning">
        <span>⚠️</span>
        <span>No Scan Data</span>
      </div>
      <div class="status-info">
        <p>Click "Rescan Page" to check for hidden content.</p>
      </div>
    `;
	}

	displayError() {
		this.statusContainer.innerHTML = `
      <div class="status-badge warning">
        <span>⚠️</span>
        <span>Error Loading Data</span>
      </div>
      <div class="status-info">
        <p>Unable to load page data. Try rescanning.</p>
      </div>
    `;
	}

	displayMessages(results) {
		if (!results || results.length === 0) {
			this.messagesContainer.innerHTML =
				'<p class="empty-state">No hidden messages detected yet.</p>';
			return;
		}

		// Store results for reference instead of in data attributes
		this.currentResults = results;

		const messagesHTML = results
			.map(
				(result, index) => `
      <div class="message-item" data-index="${index}">
        <div class="message-header">
          <span class="message-location">${result.location}</span>
        </div>
        <div class="message-preview" title="${this.escapeHtml(result.text)}">
          ${this.truncateText(result.text, 100)}
        </div>
        <div class="message-actions">
          <button class="button-small button-decode" data-index="${index}">
            <span>🔓</span>
            <span>Decode</span>
          </button>
          <button class="button-small button-copy" data-index="${index}">
            <span>📋</span>
            <span>Copy</span>
          </button>
        </div>
        <div class="decoded-content hidden" data-index="${index}">
          <div class="decoded-header">
            <span class="decoded-title">✨ Decoded Content:</span>
            <button class="button-small button-close-decoded" data-index="${index}">
              <span>✕</span>
            </button>
          </div>
          <div class="decoded-output"></div>
        </div>
      </div>
    `
			)
			.join('');

		this.messagesContainer.innerHTML = messagesHTML;

		// Add event listeners
		this.messagesContainer.querySelectorAll('.button-decode').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				const index = parseInt(e.currentTarget.dataset.index);
				const text = this.currentResults[index].text;
				this.decodeAndShow(text, e.currentTarget, index);
			});
		});

		this.messagesContainer.querySelectorAll('.button-copy').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				const index = parseInt(e.currentTarget.dataset.index);
				const text = this.currentResults[index].text;
				this.copyToClipboard(text, e.currentTarget);
			});
		});

		this.messagesContainer.querySelectorAll('.button-close-decoded').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				const index = parseInt(e.currentTarget.dataset.index);
				this.closeDecodedContent(index);
			});
		});
	}

	async decodeAndShow(encodedText, buttonElement, messageIndex) {
		// Show confirmation dialog before decoding
		const shouldDecode = confirm(
			'This will decode and reveal the hidden content.\n\n' +
				'The content may contain:\n' +
				'• Private or sensitive information\n' +
				'• Images or text you may not want to see\n' +
				'• Content not intended for you\n\n' +
				'Do you want to continue?'
		);

		if (!shouldDecode) {
			return; // User cancelled
		}

		if (!buttonElement) {
			return;
		}

		const originalContent = buttonElement.innerHTML;
		
		try {
			// Show loading state
			buttonElement.disabled = true;
			buttonElement.innerHTML = '<span>⏳</span><span>Decoding...</span>';

			// Decode the message
			const decoded = await decodeMessage(encodedText);

			// Find the decoded content container for this message
			const messageItem = buttonElement.closest('.message-item');
			const decodedContainer = messageItem.querySelector('.decoded-content');
			const decodedOutput = decodedContainer.querySelector('.decoded-output');

			// Show the decoded content container
			decodedContainer.classList.remove('hidden');

			// Check if it's an image
			if (decoded.startsWith('data:image')) {
				// Create image element safely
				const img = document.createElement('img');
				img.src = decoded;
				img.alt = 'Decoded image';
				decodedOutput.innerHTML = '';
				decodedOutput.appendChild(img);
			} else {
				// Use textContent for text to prevent XSS
				decodedOutput.textContent = decoded;
			}
		} catch (error) {
			alert('Error decoding message: ' + error.message);
		} finally {
			// Always restore button state
			buttonElement.disabled = false;
			buttonElement.innerHTML = originalContent;
		}
	}

	closeDecodedContent(messageIndex) {
		const decodedContainer = this.messagesContainer.querySelector(
			`.decoded-content[data-index="${messageIndex}"]`
		);
		if (decodedContainer) {
			decodedContainer.classList.add('hidden');
			// Clear the output
			const decodedOutput = decodedContainer.querySelector('.decoded-output');
			if (decodedOutput) {
				decodedOutput.innerHTML = '';
			}
		}
	}

	async copyToClipboard(text, btnElement) {
		try {
			await navigator.clipboard.writeText(text);
			// Show temporary feedback
			const originalText = btnElement.innerHTML;
			btnElement.innerHTML = '<span>✓</span><span>Copied!</span>';
			setTimeout(() => {
				btnElement.innerHTML = originalText;
			}, 2000);
		} catch (error) {
			alert('Failed to copy to clipboard');
		}
	}

	async rescanPage() {
		// Define unsupported URL protocols
		const UNSUPPORTED_PROTOCOLS = [
			'chrome://',
			'about:',
			'chrome-extension://',
			'edge://',
			'moz-extension://'
		];

		this.rescanButton.disabled = true;
		this.statusContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Rescanning page...</p>
      </div>
    `;

		try {
			// Get the current active tab
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

			if (!tab) {
				throw new Error('No active tab found');
			}

			// Check if the tab URL is a valid URL where content scripts can run
			const url = tab.url || '';
			if (UNSUPPORTED_PROTOCOLS.some((protocol) => url.startsWith(protocol))) {
				this.statusContainer.innerHTML = `
          <div class="status-badge warning">
            <span>⚠️</span>
            <span>Cannot Scan This Page</span>
          </div>
          <div class="status-info">
            <p>This extension cannot scan browser internal pages or extension pages.</p>
            <p>Please navigate to a regular web page to scan for hidden content.</p>
          </div>
        `;
				this.rescanButton.disabled = false;
				return;
			}

			// Send message to content script to rescan
			try {
				const response = await chrome.tabs.sendMessage(tab.id, { type: 'RESCAN_PAGE' });

				// Wait a bit for the scan to complete
				setTimeout(() => {
					this.loadPageData();
					this.rescanButton.disabled = false;
				}, 1000);
			} catch (messageError) {
				// Content script might not be loaded, try to inject it
				console.warn(
					'[Hidenly Sidebar] Content script not responding, attempting to reload:',
					messageError
				);

				// Show a message to reload the page
				this.statusContainer.innerHTML = `
          <div class="status-badge warning">
            <span>⚠️</span>
            <span>Extension Not Ready</span>
          </div>
          <div class="status-info">
            <p>The extension needs to be active on this page.</p>
            <p>Please <strong>reload the page</strong> and try scanning again.</p>
          </div>
        `;
				this.rescanButton.disabled = false;
			}
		} catch (error) {
			console.error('[Hidenly Sidebar] Rescan error:', error);
			this.statusContainer.innerHTML = `
        <div class="status-badge warning">
          <span>⚠️</span>
          <span>Error Scanning Page</span>
        </div>
        <div class="status-info">
          <p>Unable to scan this page. Please try the following:</p>
          <ul style="margin-left: 20px; margin-top: 10px;">
            <li>Reload the page and try again</li>
            <li>Make sure you're on a regular web page (not a browser internal page)</li>
            <li>Check that the extension has permission to access this site</li>
          </ul>
        </div>
      `;
			this.rescanButton.disabled = false;
		}
	}

	truncateText(text, maxLength) {
		const escaped = this.escapeHtml(text);
		if (escaped.length <= maxLength) return escaped;
		return escaped.substring(0, maxLength) + '...';
	}

	truncateUrl(url, maxLength = 50) {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength) + '...';
	}

	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}

/**
 * Decoder Panel Manager
 */
class DecoderPanel {
	constructor() {
		this.input = document.getElementById('decode-input');
		this.button = document.getElementById('decode-button');
		this.resultContainer = document.getElementById('decode-result');
		this.resultOutput = document.getElementById('decode-output');

		this.init();
	}

	init() {
		this.button.addEventListener('click', () => this.decode());

		// Enable decode on Enter (Ctrl+Enter for textarea)
		this.input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				this.decode();
			}
		});
	}

	async decode() {
		const text = this.input.value.trim();

		if (!text) {
			alert('Please enter some text to decode');
			return;
		}

		this.button.disabled = true;
		this.button.textContent = 'Decoding...';
		this.resultContainer.classList.add('hidden');

		try {
			const decoded = await decodeMessage(text);

			this.resultContainer.classList.remove('hidden');

			// Check if it's an image
			if (decoded.startsWith('data:image')) {
				// Create image element safely
				const img = document.createElement('img');
				img.src = decoded;
				img.alt = 'Decoded image';
				this.resultOutput.innerHTML = '';
				this.resultOutput.appendChild(img);
			} else {
				this.resultOutput.textContent = decoded;
			}
		} catch (error) {
			this.resultOutput.textContent = `Error: ${error.message}`;
			this.resultContainer.classList.remove('hidden');
		} finally {
			this.button.disabled = false;
			this.button.innerHTML = '<span>🔓</span><span>Decode Message</span>';
		}
	}
}

/**
 * Initialize the sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
	console.log('[Hidenly Sidebar] Initializing...');

	try {
		// Initialize WASM
		await initWasm();

		// Initialize managers
		new TabManager();
		new DetectionPanel();
		new DecoderPanel();

		console.log('[Hidenly Sidebar] Initialization complete');
	} catch (error) {
		console.error('[Hidenly Sidebar] Initialization error:', error);
	}
});
