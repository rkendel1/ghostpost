/**
 * Ghost Post Sidebar Panel Script
 * Handles UI interactions and WASM integration for encode/decode
 */

// Import WASM module
import init, { decode, decode_reference, encode } from '../wasm/wasm.js';

function uuidv4() {
	return crypto.randomUUID();
}

let wasmInitialized = false;

// API Configuration
const API_BASE_URL = 'https://ghostpost-six.vercel.app'; // Production API URL

// Delimiter for post ID in the secret payload
const POST_ID_DELIMITER = '||ghostid:';
const POST_ID_END = '||';

// Confetti for limited reveals (optional)
let confetti = window.confetti ? window.confetti : null;

/**
 * Initialize WASM module
 */
async function initWasm() {
	if (!wasmInitialized) {
		try {
			const wasmUrl = chrome.runtime.getURL('wasm/wasm_bg.wasm');
			const response = await fetch(wasmUrl);

			if (!response.ok) {
				throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
			}

			const wasmBytes = await response.arrayBuffer();
			await init({ module_or_path: wasmBytes });
			wasmInitialized = true;
			console.log('[Ghost Post Sidebar] WASM initialized successfully');
		} catch (error) {
			console.error('[Ghost Post Sidebar] Failed to initialize WASM:', error);
			throw error;
		}
	}
}

/**
 * Ported encodeMessage from src/lib/ghostpost.ts
 */
async function encodeMessage(visibleMessage, secretMessage, enableAnalytics = true) {
	await initWasm();

	let finalSecret = secretMessage;
	let postId;

	if (enableAnalytics) {
		postId = uuidv4();
		finalSecret = `${secretMessage}${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, finalSecret);

	const visibleLength = visibleMessage.length;
	const totalLength = encoded.length;
	const hiddenLength = totalLength - visibleLength;

	return { encoded, postId, visibleLength, hiddenLength, totalLength };
}

/**
 * Ported imageFileToBase64
 */
function imageFileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const arrayBuffer = reader.result;
			const uint8Array = new Uint8Array(arrayBuffer);
			let binaryString = '';
			uint8Array.forEach(byte => binaryString += String.fromCharCode(byte));
			resolve(btoa(binaryString));
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Ported resizeImageIfNeeded
 */
async function resizeImageIfNeeded(file, maxSizeKB = 25, maxWidth = 600, maxHeight = 600) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const reader = new FileReader();

		reader.onload = e => img.src = e.target.result;

		img.onload = () => {
			let width = img.width;
			let height = img.height;

			if (width > maxWidth || height > maxHeight) {
				const aspectRatio = width / height;
				if (width > height) {
					width = maxWidth;
					height = width / aspectRatio;
				} else {
					height = maxHeight;
					width = height * aspectRatio;
				}
			}

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return reject(new Error('Canvas context failed'));

			ctx.drawImage(img, 0, 0, width, height);

			const QUALITY_LEVELS = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];
			const SCALE_FACTORS = [0.9, 0.8, 0.7, 0.6, 0.5];

			const tryQuality = (quality, scaleFactor = 1.0) => new Promise(res => {
				const scaledWidth = Math.floor(width * scaleFactor);
				const scaledHeight = Math.floor(height * scaleFactor);
				const finalCanvas = scaleFactor < 1.0 ? document.createElement('canvas') : canvas;
				if (scaleFactor < 1.0) {
					finalCanvas.width = scaledWidth;
					finalCanvas.height = scaledHeight;
					const finalCtx = finalCanvas.getContext('2d');
					if (finalCtx) finalCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
				}

				finalCanvas.toBlob(blob => {
					if (blob && blob.size <= maxSizeKB * 1024) {
						const newFileName = file.name.replace(/\.[^.]*$/, '.jpg');
						res(new File([blob], newFileName, { type: 'image/jpeg', lastModified: Date.now() }));
					} else {
						res(null);
					}
				}, 'image/jpeg', quality);
			});

			(async () => {
				try {
					for (const quality of QUALITY_LEVELS) {
						const processed = await tryQuality(quality, 1.0);
						if (processed) return resolve(processed);
					}
					for (const scale of SCALE_FACTORS) {
						const processed = await tryQuality(QUALITY_LEVELS[QUALITY_LEVELS.length - 1], scale);
						if (processed) return resolve(processed);
					}
					reject(new Error(`Image too large for ${maxSizeKB}KB. Use smaller image.`));
				} catch (err) {
					reject(err);
				}
			})();
		};

		img.onerror = () => reject(new Error('Failed to load image'));
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsDataURL(file);
	});
}

/**
 * Ported encodeImage
 */
async function encodeImage(visibleMessage, imageFile, enableAnalytics = true) {
	await initWasm();

	const processedFile = await resizeImageIfNeeded(imageFile);
	const base64Image = await imageFileToBase64(processedFile);
	let imageWithMeta = `data:${processedFile.type};base64,${base64Image}`;

	let postId;
	if (enableAnalytics) {
		postId = uuidv4();
		imageWithMeta += `${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, imageWithMeta);

	const visibleLength = visibleMessage.length;
	const totalLength = encoded.length;
	const hiddenLength = totalLength - visibleLength;

	return { encoded, postId, visibleLength, hiddenLength, totalLength };
}

/**
 * Decode a message using WASM and extract postId if present
 * @returns {Promise<{message: string, postId?: string}>}
 */
async function decodeMessage(encodedText) {
	await initWasm();
	try {
		try {
			const [referenceType, referenceId] = decode_reference(encodedText);
			if (referenceType !== 'ghostpost') {
				throw new Error(`Unsupported hosted reference: ${referenceType}`);
			}
			const response = await fetch(
				`${API_BASE_URL}/api/posts/reveal?post_id=${encodeURIComponent(referenceId)}`
			);
			const hosted = await response.json();
			if (!response.ok || !hosted.success) {
				throw new Error(hosted.error || 'Failed to load hosted secret');
			}
			return { message: hosted.message, postId: referenceId };
		} catch (referenceError) {
			if (
				referenceError instanceof Error &&
				(referenceError.message.startsWith('Unsupported hosted') ||
					referenceError.message.startsWith('Failed to load') ||
					referenceError.message.startsWith('Hosted secret'))
			) {
				throw referenceError;
			}
		}

		const decoded = decode(encodedText);

		// Check if there's a post ID in the decoded message
		const postIdIndex = decoded.indexOf(POST_ID_DELIMITER);
		if (postIdIndex !== -1) {
			const postIdStart = postIdIndex + POST_ID_DELIMITER.length;
			const postIdEnd = decoded.indexOf(POST_ID_END, postIdStart);
			if (postIdEnd !== -1) {
				const postId = decoded.substring(postIdStart, postIdEnd);
				const message = decoded.substring(0, postIdIndex);
				return { message, postId };
			}
		}

		return { message: decoded };
	} catch (error) {
		console.error('[Ghost Post Sidebar] Decode error:', error);
		throw error;
	}
}

/**
 * Generate a browser fingerprint for reveal tracking
 */
function generateFingerprint() {
	const components = [
		navigator.userAgent,
		navigator.language,
		navigator.languages?.join(',') || '',
		screen.width.toString(),
		screen.height.toString(),
		screen.colorDepth.toString(),
		new Date().getTimezoneOffset().toString(),
		navigator.hardwareConcurrency?.toString() || '',
		navigator.deviceMemory?.toString() || ''
	];

	// Canvas fingerprinting for additional entropy
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const txt = 'ghostpost-fingerprint-2024';
	if (ctx) {
		ctx.textBaseline = 'top';
		ctx.font = '14px Arial';
		ctx.fillStyle = '#f60';
		ctx.fillRect(0, 0, 100, 50);
		ctx.fillStyle = '#069';
		ctx.fillText(txt, 2, 2);
	}
	const canvasData = canvas.toDataURL().slice(-50);
	components.push(canvasData);

	const fingerprint = components.join('|');

	// Create a simple hash
	let hash = 0;
	for (let i = 0; i < fingerprint.length; i++) {
		const char = fingerprint.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36);
}

/**
 * Check auth status
 */
async function checkAuth() {
	try {
		const response = await fetch(`${API_BASE_URL}/api/auth`, { credentials: 'include' });
		const data = await response.json();
		return data.user || null;
	} catch {
		return null;
	}
}

/**
 * Trigger confetti for low limited reveals
 */
function triggerConfetti() {
	if (confetti) {
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 }
		});
	}
}

/**
 * Check reveal status for a post
 */
async function checkRevealStatus(postId) {
	try {
		const response = await fetch(`${API_BASE_URL}/api/limited-reveals/status?post_id=${postId}`);
		const data = await response.json();
		return data;
	} catch (error) {
		console.warn('[Ghost Post Sidebar] Failed to check reveal status:', error);
		return null;
	}
}

/**
 * Record a reveal for a post
 */
async function recordReveal(postId) {
	try {
		const response = await fetch(`${API_BASE_URL}/api/limited-reveals/reveal`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				post_id: postId,
				user_fingerprint: generateFingerprint()
			})
		});
		const data = await response.json();
		return data;
	} catch (error) {
		console.warn('[Ghost Post Sidebar] Failed to record reveal:', error);
		return null;
	}
}

/**
 * Tab Management - Updated for encoding tab
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
		const panel = document.getElementById(`${targetPanel}-panel`);
		if (panel) panel.classList.add('active');

		// Trigger encoding auth check on switch
		if (targetPanel === 'encoding') {
			encodingPanel.checkAuth();
		}
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
			console.error('[Ghost Post Sidebar] Error loading page data:', error);
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

		this.messagesContainer.querySelectorAll('.button-decode').forEach((btn) => {
			btn.addEventListener('click', (e) => {
				const index = parseInt(e.currentTarget.dataset.index);
				const text = this.currentResults[index].text;
				this.decodeAndShow(text, e.currentTarget);
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

	async decodeAndShow(encodedText, buttonElement) {
		const shouldDecode = confirm(
			'This will decode and reveal the hidden content.\n\n' +
				'The content may contain:\n' +
				'• Private or sensitive information\n' +
				'• Images or text you may not want to see\n' +
				'• Content not intended for you\n\n' +
				'Do you want to continue?'
		);

		if (!shouldDecode) return;

		if (!buttonElement) return;

		const originalContent = buttonElement.innerHTML;

		try {
			buttonElement.disabled = true;
			buttonElement.innerHTML = '<span>⏳</span><span>Decoding...</span>';

			const decoded = await decodeMessage(encodedText);

			const messageItem = buttonElement.closest('.message-item');
			if (!messageItem) throw new Error('Could not find message container for decoding');

			const decodedContainer = messageItem.querySelector('.decoded-content');
			if (!decodedContainer) throw new Error('Decoded content element missing from DOM');

			const decodedOutput = decodedContainer.querySelector('.decoded-output');
			if (!decodedOutput) throw new Error('Decoded output element missing from DOM');

			let revealResult = null;
			if (decoded.postId) {
				const statusResponse = await checkRevealStatus(decoded.postId);
				if (statusResponse?.success && statusResponse.status) {
					const status = statusResponse.status;

					if (status.is_expired || !status.can_reveal) {
						alert('❌ This secret has expired — all reveals are gone forever 💔');
						return;
					}

					revealResult = await recordReveal(decoded.postId);

					if (!revealResult?.success) {
						alert('❌ Failed to reveal secret: ' + (revealResult?.message || 'Unknown error'));
						return;
					}

					if (revealResult.remaining !== null && revealResult.remaining <= 10 && revealResult.remaining >= 0) {
						triggerConfetti();
					}
				}
			}

			const fingerprint = generateFingerprint();
			if (decoded.postId) {
				try {
					const trackResponse = await fetch(`${API_BASE_URL}/api/decode/track`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ post_id: decoded.postId, user_fingerprint: fingerprint })
					});
					const trackData = await trackResponse.json();
					if (trackData.success) {
						console.log(`[Ghost Post Sidebar] Decode tracked: attempt #${trackData.decode_count}`);
					} else {
						console.warn('[Ghost Post Sidebar] Failed to track decode:', trackData.message);
					}
				} catch (trackError) {
					console.warn('[Ghost Post Sidebar] Error tracking decode:', trackError);
				}
			}

			decodedContainer.classList.remove('hidden');

			while (decodedOutput.firstChild) {
				decodedOutput.removeChild(decodedOutput.firstChild);
			}

			if (revealResult && revealResult.reveal_number !== null) {
				const revealInfo = document.createElement('div');
				revealInfo.className = 'reveal-info card p-4 space-y-2';

				let headerText = '🎉 Limited Edition Reveal!';
				let variant = 'variant-ghost-primary';
				if (revealResult.remaining === 0) {
					headerText = '🔥 SOLD OUT FOREVER! 🔥';
					variant = 'variant-ghost-error';
				} else if (revealResult.remaining !== null && revealResult.remaining <= 5) {
					headerText = `⚠️ ONLY ${revealResult.remaining} LEFT! ⚠️`;
					variant = 'variant-ghost-warning animate-pulse';
				} else if (revealResult.remaining <= 20) {
					headerText = 'Limited Edition Reveal!';
					variant = 'variant-ghost-warning';
				}

				revealInfo.className = `reveal-info card ${variant} p-4 space-y-2`;

				let progressHTML = '';
				if (revealResult.total_reveals) {
					const percentage = (revealResult.reveal_number / revealResult.total_reveals) * 100;
					progressHTML = `
						<div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
							<div class="h-full transition-all duration-500 bg-blue-500" style="width: ${percentage}%"></div>
						</div>
					`;
				}

				revealInfo.innerHTML = `
					<div class="flex items-center justify-between">
						<span class="font-bold text-lg">${headerText}</span>
						${revealResult.total_reveals ? `<span class="text-2xl font-bold">${revealResult.reveal_number}/${revealResult.total_reveals}</span>` : ''}
					</div>
					<p class="text-sm">${revealResult.message}</p>
					${progressHTML}
				`;

				decodedOutput.appendChild(revealInfo);
			}

			const contentDiv = document.createElement('div');
			contentDiv.className = 'decoded-message mt-4 p-4 bg-slate-700 rounded-lg';

			if (decoded.message.startsWith('data:image')) {
				const img = document.createElement('img');
				img.src = decoded.message;
				img.alt = 'Decoded image';
				img.className = 'max-w-full rounded-lg';
				contentDiv.appendChild(img);
			} else {
				contentDiv.textContent = decoded.message;
			}

			decodedOutput.appendChild(contentDiv);
		} catch (error) {
			alert('Error decoding message: ' + error.message);
		} finally {
			if (buttonElement && buttonElement.parentNode) {
				buttonElement.disabled = false;
				buttonElement.innerHTML = originalContent;
			}
		}
	}

	closeDecodedContent(messageIndex) {
		const decodedContainer = this.messagesContainer.querySelector(
			`.decoded-content[data-index="${messageIndex}"]`
		);
		if (decodedContainer) {
			decodedContainer.classList.add('hidden');
			const decodedOutput = decodedContainer.querySelector('.decoded-output');
			if (decodedOutput) {
				while (decodedOutput.firstChild) {
					decodedOutput.removeChild(decodedOutput.firstChild);
				}
			}
		}
	}

	async copyToClipboard(text, btnElement) {
		try {
			await navigator.clipboard.writeText(text);
			const originalText = btnElement.innerHTML;
			btnElement.innerHTML = '<span>✓</span><span>Copied!</span>';
			setTimeout(() => btnElement.innerHTML = originalText, 2000);
		} catch (error) {
			alert('Failed to copy to clipboard');
		}
	}

	async rescanPage() {
		const UNSUPPORTED_PROTOCOLS = ['chrome://', 'about:', 'chrome-extension://', 'edge://', 'moz-extension://'];

		this.rescanButton.disabled = true;
		this.statusContainer.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Rescanning page...</p>
      </div>
    `;

		try {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

			if (!tab) throw new Error('No active tab found');

			const url = tab.url || '';
			if (UNSUPPORTED_PROTOCOLS.some(protocol => url.startsWith(protocol))) {
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

			try {
				await chrome.tabs.sendMessage(tab.id, { type: 'RESCAN_PAGE' });
				setTimeout(() => {
					this.loadPageData();
					this.rescanButton.disabled = false;
				}, 1000);
			} catch (messageError) {
				console.warn('[Ghost Post Sidebar] Content script not responding, attempting to reload:', messageError);
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
			console.error('[Ghost Post Sidebar] Rescan error:', error);
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
 * Decoding Panel Manager (renamed from Decoder)
 */
class DecodingPanel {
	constructor() {
		this.input = document.getElementById('decode-input');
		this.button = document.getElementById('decode-button');
		this.clearButton = document.getElementById('clear-button');
		this.resultContainer = document.getElementById('decode-result');
		this.resultOutput = document.getElementById('decode-output');

		this.init();
	}

	init() {
		this.button.addEventListener('click', () => this.decode());
		this.clearButton.addEventListener('click', () => this.clear());

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
		this.button.innerHTML = '<span>🔓</span><span>Decoding...</span>';
		this.resultContainer.classList.add('hidden');

		try {
			const decoded = await decodeMessage(text);

			this.resultContainer.classList.remove('hidden');

			if (decoded.message.startsWith('data:image')) {
				const img = document.createElement('img');
				img.src = decoded.message;
				img.alt = 'Decoded image';
				img.className = 'max-w-full rounded-lg';
				this.resultOutput.innerHTML = '';
				this.resultOutput.appendChild(img);
			} else {
				this.resultOutput.value = decoded.message;
			}
		} catch (error) {
			this.resultOutput.value = `Error: ${error.message}`;
			this.resultContainer.classList.remove('hidden');
		} finally {
			this.button.disabled = false;
			this.button.innerHTML = '<span>🔓</span><span>Decode Secret</span>';
		}
	}

	clear() {
		this.input.value = '';
		this.resultContainer.classList.add('hidden');
	}
}

/**
 * Encoding Panel Manager
 */
class EncodingPanel {
	constructor() {
		this.authGate = document.getElementById('auth-gate');
		this.encodingContent = document.getElementById('encoding-content');
		this.aiToggle = document.getElementById('ai-toggle');
		this.aiMode = document.getElementById('ai-mode');
		this.manualMode = document.getElementById('manual-mode');
		this.platformSelect = document.getElementById('platform-select');
		this.promptInput = document.getElementById('prompt-input');
		this.generateBtn = document.getElementById('generate-btn');
		this.manualBtn = document.getElementById('manual-btn');
		this.visibleTextarea = document.getElementById('visible-textarea');
		this.secretType = document.getElementById('secret-type');
		this.textSecret = document.getElementById('text-secret');
		this.imageSecret = document.getElementById('image-secret');
		this.secretTextarea = document.getElementById('secret-textarea');
		this.secretFile = document.getElementById('secret-file');
		this.imagePreview = document.getElementById('image-preview');
		this.previewImg = document.getElementById('preview-img');
		this.imageSize = document.getElementById('image-size');
		this.limitedToggle = document.getElementById('limited-toggle');
		this.limitedInput = document.getElementById('limited-input');
		this.maxReveals = document.getElementById('max-reveals');
		this.encodeButton = document.getElementById('encode-button');
		this.previewCard = document.getElementById('preview-card');
		this.previewContent = document.getElementById('preview-content');
		this.outputCard = document.getElementById('output-card');
		this.encodedOutput = document.getElementById('encoded-output');
		this.stats = document.getElementById('stats');
		this.copyBtn = document.getElementById('copy-btn');
		this.resetBtn = document.getElementById('reset-btn');
		this.loginButton = document.getElementById('login-button');

		this.user = null;
		this.currentPostId = null;
		this.secretImage = null;

		this.init();
	}

	init() {
		this.loginButton.addEventListener('click', () => window.open(`${API_BASE_URL}/auth`, '_blank'));

		this.aiToggle.addEventListener('change', (e) => {
			if (e.target.checked) {
				this.aiMode.classList.remove('hidden');
				this.manualMode.classList.add('hidden');
			} else {
				this.aiMode.classList.add('hidden');
				this.manualMode.classList.remove('hidden');
			}
		});

		this.generateBtn.addEventListener('click', () => this.generateContent());

		this.manualBtn.addEventListener('click', () => {
			this.aiToggle.checked = false;
			this.aiMode.classList.add('hidden');
			this.manualMode.classList.remove('hidden');
		});

		this.secretType.addEventListener('change', (e) => {
			if (e.target.value === 'text') {
				this.textSecret.classList.remove('hidden');
				this.imageSecret.classList.add('hidden');
				this.secretImage = null;
				this.imagePreview.classList.add('hidden');
			} else {
				this.textSecret.classList.add('hidden');
				this.imageSecret.classList.remove('hidden');
			}
		});

		this.secretFile.addEventListener('change', (e) => this.handleSecretFile(e));

		this.limitedToggle.addEventListener('change', (e) => {
			this.limitedInput.classList.toggle('hidden', !e.target.checked);
		});

		this.encodeButton.addEventListener('click', () => this.handleEncode());

		this.copyBtn.addEventListener('click', () => this.copyEncoded());

		this.resetBtn.addEventListener('click', () => this.reset());

		this.updatePreview();
	}

	async checkAuth() {
		this.user = await checkAuth();
		if (this.user) {
			this.authGate.classList.add('hidden');
			this.encodingContent.classList.remove('hidden');
		} else {
			this.authGate.classList.remove('hidden');
			this.encodingContent.classList.add('hidden');
		}
	}

	async generateContent() {
		const prompt = this.promptInput.value.trim();
		if (!prompt) return alert('Please enter a prompt');

		this.generateBtn.disabled = true;
		this.generateBtn.innerHTML = '<span>⏳</span><span>Generating...</span>';

		try {
			const platform = this.platformSelect.value;
			const response = await fetch(`${API_BASE_URL}/api/ai-compose`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, platform })
			});
			const data = await response.json();

			if (data.success) {
				this.visibleTextarea.value = data.content;
				this.updatePreview();
			} else {
				alert(data.error || 'Failed to generate content');
			}
		} catch (err) {
			alert('Network error: Failed to connect to API');
			console.error(err);
		} finally {
			this.generateBtn.disabled = false;
			this.generateBtn.innerHTML = '<span>✨</span><span>Generate with AI</span>';
		}
	}

	handleSecretFile(e) {
		const file = e.target.files[0];
		if (!file || !file.type.startsWith('image/')) {
			alert('Please select a valid image file');
			return;
		}

		this.secretImage = file;
		const reader = new FileReader();
		reader.onload = e => {
			this.previewImg.src = e.target.result;
			this.imagePreview.classList.remove('hidden');
			this.imageSize.textContent = `Size: ${(file.size / 1024).toFixed(1)} KB${file.size > 25 * 1024 ? ' (will be compressed)' : ''}`;
		};
		reader.readAsDataURL(file);
		this.updatePreview();
	}

	async handleEncode() {
		const visibleMessage = this.visibleTextarea.value.trim();
		if (!visibleMessage) return alert('Visible message is required');

		const secretType = this.secretType.value;
		let secretMessage = this.secretTextarea.value.trim();
		if (secretType === 'text' && !secretMessage) return alert('Secret text is required');
		if (secretType === 'image' && !this.secretImage) return alert('Please select an image');

		const enableLimited = this.limitedToggle.checked;
		const maxReveals = enableLimited ? parseInt(this.maxReveals.value) || 0 : null;

		this.encodeButton.disabled = true;
		this.encodeButton.innerHTML = '<span>🔒</span><span>Encoding...</span>';

		try {
			let result;
			if (secretType === 'image') {
				result = await encodeImage(visibleMessage, this.secretImage, true);
			} else {
				result = await encodeMessage(visibleMessage, secretMessage, true);
			}

			this.currentPostId = result.postId;

			if (this.user) {
				const platform = this.platformSelect.value;
				const saveResponse = await fetch(`${API_BASE_URL}/api/posts/save`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						post_id: result.postId,
						content: result.encoded,
						platform,
						visible_message: visibleMessage,
						secret_message: secretType === 'text' ? secretMessage : 'image',
						secret_type: secretType
					})
				});
				const saveData = await saveResponse.json();
				if (!saveData.success) console.warn('Save failed:', saveData.error);

				if (enableLimited && maxReveals > 0) {
					const initResponse = await fetch(`${API_BASE_URL}/api/limited-reveals/init`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({
							post_id: result.postId,
							max_reveals: maxReveals,
							user_id: this.user.id
						})
					});
					const initData = await initResponse.json();
					if (!initData.success) console.warn('Limited init failed:', initData.error);
				}
			}

			this.encodedOutput.value = result.encoded;
			this.stats.innerHTML = `
				<p>Visible: <strong>${result.visibleLength}</strong> chars</p>
				<p>Hidden: <strong>${result.hiddenLength}</strong> chars</p>
				<p>Total: <strong>${result.totalLength}</strong> chars</p>
				${result.totalLength > 40000 ? '<p class="text-red-500 font-bold mt-2">⚠️ Exceeds 40k chars - platform limit</p>' : result.totalLength > 10000 ? '<p class="text-amber-500 mt-2">ℹ️ Note: Some platforms limit ~280 chars</p>' : ''}
			`;
			this.previewCard.classList.add('hidden');
			this.outputCard.classList.remove('hidden');
		} catch (err) {
			alert('Failed to encode: ' + err.message);
			console.error(err);
		} finally {
			this.encodeButton.disabled = false;
			this.encodeButton.innerHTML = '<span>🔒</span><span>Encode Secret</span>';
		}
	}

	updatePreview() {
		const visible = this.visibleTextarea.value.trim();
		const secretType = this.secretType.value;
		const secret = secretType === 'text' ? this.secretTextarea.value.trim() : (this.secretImage ? 'Image' : '');

		let previewHTML = '';
		if (visible) {
			previewHTML += `
				<div>
					<h3 class="font-bold text-sm mb-1">Visible Message:</h3>
					<div class="card p-4 variant-ghost-surface">
						<p class="text-sm whitespace-pre-wrap">${this.escapeHtml(visible)}</p>
					</div>
				</div>
			`;
		}

		if (secret) {
			previewHTML += `
				<div>
					<h3 class="font-bold text-sm mb-1">Secret Content:</h3>
					<div class="card p-4 variant-ghost-secondary">
						${secretType === 'text' ? `<p class="text-sm whitespace-pre-wrap">${this.escapeHtml(secret)}</p>` : (this.previewImg.src ? `<img src="${this.previewImg.src}" class="max-w-full max-h-32 object-contain rounded" alt="Secret" />` : '')}
					</div>
				</div>
			`;
		}

		if (previewHTML) {
			this.previewContent.innerHTML = previewHTML + '<div class="card p-3 variant-ghost-primary"><p class="text-xs opacity-75">👆 Ready to encode? Click "Encode Secret"!</p></div>';
		} else {
			this.previewContent.innerHTML = '<div class="card p-8 variant-ghost-surface text-center"><p class="text-sm opacity-50">Your message preview will appear here...</p></div>';
		}
	}

	async copyEncoded() {
		try {
			await navigator.clipboard.writeText(this.encodedOutput.value);
			this.copyBtn.innerHTML = '✓ Copied!';
			setTimeout(() => this.copyBtn.innerHTML = '📋 Copy', 2000);
		} catch {
			alert('Failed to copy');
		}
	}

	reset() {
		this.promptInput.value = '';
		this.visibleTextarea.value = '';
		this.secretTextarea.value = '';
		this.secretFile.value = '';
		this.maxReveals.value = '';
		this.limitedToggle.checked = false;
		this.aiToggle.checked = false;
		this.secretType.value = 'text';
		this.imagePreview.classList.add('hidden');
		this.secretImage = null;
		this.currentPostId = null;
		this.previewCard.classList.remove('hidden');
		this.outputCard.classList.add('hidden');
		this.updatePreview();
		this.limitedInput.classList.add('hidden');
		this.aiMode.classList.remove('hidden');
		this.manualMode.classList.add('hidden');
		this.textSecret.classList.remove('hidden');
		this.imageSecret.classList.add('hidden');
	}

	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}
}

/**
 * Initialize the sidebar
 */
document.addEventListener('DOMContentLoaded', async () => {
	console.log('[Ghost Post Sidebar] Initializing...');

	try {
		await initWasm();

		new TabManager();
		new DetectionPanel();
		const decodingPanel = new DecodingPanel();
		const encodingPanel = new EncodingPanel();

		console.log('[Ghost Post Sidebar] Initialization complete');
	} catch (error) {
		console.error('[Ghost Post Sidebar] Initialization error:', error);
	}
});
