/**
 * Ghostpost WASM Integration Module
 *
 * This module provides the encode/decode functionality using the ghostpost WASM package.
 *
 * SETUP INSTRUCTIONS:
 * ===================
 * 1. Build the WASM package from the root directory:
 *    npm run build:wasm
 *
 * 2. The WASM files will be generated in /wasm/pkg/ directory:
 *    - wasm.js (JavaScript glue code)
 *    - wasm_bg.wasm (WebAssembly binary)
 *    - wasm.d.ts (TypeScript definitions)
 *
 * 3. The wasm package is already linked in package.json as a local dependency
 *
 * 4. Import and use in your components:
 *    import { initWasm, encodeMessage, decodeMessage } from '$lib/ghostpost';
 *
 * USAGE:
 * ======
 * // Initialize WASM (call once, usually in onMount)
 * await initWasm();
 *
 * // Encode a secret message
 * const encoded = await encodeMessage("Hello World", "This is secret");
 *
 * // Decode a message
 * const decoded = await decodeMessage(encoded);
 */

import init, { encode, decode } from 'wasm';
import { v4 as uuidv4 } from 'uuid';
import type { EncodingResult } from './types/encoding';

let wasmInitialized = false;

// Delimiter for post ID in the secret payload
const POST_ID_DELIMITER = '||ghostid:';
const POST_ID_END = '||';

// Image processing constants
const MAX_IMAGE_SIZE_KB = 100;
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;
const QUALITY_LEVELS = [0.9, 0.8, 0.7, 0.6, 0.5];

/**
 * Initialize the WASM module
 * Must be called before using encode/decode functions
 */
export async function initWasm(): Promise<void> {
	if (!wasmInitialized) {
		await init();
		wasmInitialized = true;
	}
}

/**
 * Encode a secret message into a visible message with analytics tracking
 * @param visibleMessage - The message that will be shown publicly
 * @param secretMessage - The hidden message to encode
 * @param enableAnalytics - Whether to include a tracking ID (default: true)
 * @returns Object with encoded message, character counts, and postId (if analytics enabled)
 */
export async function encodeMessage(
	visibleMessage: string,
	secretMessage: string,
	enableAnalytics = true
): Promise<EncodingResult> {
	await initWasm();

	let finalSecret = secretMessage;
	let postId: string | undefined;

	// Add post ID to secret if analytics enabled
	if (enableAnalytics) {
		postId = uuidv4();
		finalSecret = `${secretMessage}${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, finalSecret);

	// Calculate character counts
	const visibleLength = visibleMessage.length;
	const totalLength = encoded.length;
	const hiddenLength = totalLength - visibleLength;

	return { encoded, postId, visibleLength, hiddenLength, totalLength };
}

/**
 * Decode a message to reveal the hidden secret
 * @param encodedMessage - The message containing the hidden secret
 * @returns Object with decoded message and postId (if present)
 */
export async function decodeMessage(
	encodedMessage: string
): Promise<{ message: string; postId?: string }> {
	await initWasm();
	const decoded = decode(encodedMessage);

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
}

/**
 * Convert an image file to base64 string
 * @param file - The image file to convert
 * @returns Base64 encoded string
 */
function imageFileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const arrayBuffer = reader.result as ArrayBuffer;
			const uint8Array = new Uint8Array(arrayBuffer);
			let binaryString = '';
			uint8Array.forEach((byte) => {
				binaryString += String.fromCharCode(byte);
			});
			resolve(btoa(binaryString));
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsArrayBuffer(file);
	});
}

/**
 * Resize and compress an image if it's too large
 * @param file - The image file to process
 * @param maxSizeKB - Maximum size in KB (default: 100KB)
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param maxHeight - Maximum height in pixels (default: 800)
 * @returns Promise<File> - The processed image file
 */
async function resizeImageIfNeeded(
	file: File,
	maxSizeKB: number = MAX_IMAGE_SIZE_KB,
	maxWidth: number = MAX_IMAGE_WIDTH,
	maxHeight: number = MAX_IMAGE_HEIGHT
): Promise<File> {
	// If file is already small enough, return it as-is
	if (file.size <= maxSizeKB * 1024) {
		return file;
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const reader = new FileReader();

		reader.onload = (e) => {
			img.src = e.target?.result as string;
		};

		img.onload = () => {
			// Calculate new dimensions while maintaining aspect ratio
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

			// Create canvas and draw resized image
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Failed to get canvas context'));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);

			// Try different quality settings to get under the size limit
			const tryQuality = async (quality: number): Promise<Blob | null> => {
				return new Promise((resolve) => {
					canvas.toBlob(
						(blob) => {
							if (blob && blob.size <= maxSizeKB * 1024) {
								resolve(blob);
							} else {
								resolve(null);
							}
						},
						file.type === 'image/png' ? 'image/jpeg' : file.type,
						quality
					);
				});
			};

			// Try progressively lower quality until we get under the size limit
			(async () => {
				for (const quality of QUALITY_LEVELS) {
					const blob = await tryQuality(quality);
					if (blob) {
						const newFile = new File([blob], file.name, {
							type: file.type === 'image/png' ? 'image/jpeg' : file.type,
							lastModified: Date.now()
						});
						resolve(newFile);
						return;
					}
				}
				// If still too large, reject with error
				reject(
					new Error(
						`Image is too large. Please use an image smaller than ${maxSizeKB}KB or reduce dimensions.`
					)
				);
			})();
		};

		img.onerror = () => {
			reject(new Error('Failed to load image'));
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsDataURL(file);
	});
}

/**
 * Encode an image into a visible message with analytics tracking
 * @param visibleMessage - The message that will be shown publicly
 * @param imageFile - The image file to encode
 * @param enableAnalytics - Whether to include a tracking ID (default: true)
 * @returns Object with encoded message, character counts, and postId (if analytics enabled)
 */
export async function encodeImage(
	visibleMessage: string,
	imageFile: File,
	enableAnalytics = true
): Promise<EncodingResult> {
	await initWasm();

	// Resize image if needed to prevent crashes on mobile devices
	// Maximum 100KB to keep encoded strings manageable
	const processedFile = await resizeImageIfNeeded(
		imageFile,
		MAX_IMAGE_SIZE_KB,
		MAX_IMAGE_WIDTH,
		MAX_IMAGE_HEIGHT
	);

	// Convert image to base64
	const base64Image = await imageFileToBase64(processedFile);
	let imageWithMeta = `data:${processedFile.type};base64,${base64Image}`;

	let postId: string | undefined;

	// Add post ID to secret if analytics enabled
	if (enableAnalytics) {
		postId = uuidv4();
		imageWithMeta = `${imageWithMeta}${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, imageWithMeta);

	// Calculate character counts
	const visibleLength = visibleMessage.length;
	const totalLength = encoded.length;
	const hiddenLength = totalLength - visibleLength;

	return { encoded, postId, visibleLength, hiddenLength, totalLength };
}

/**
 * Decode an image from an encoded message
 * @param encodedMessage - The message containing the hidden image
 * @returns Object with decoded image URL and postId (if present)
 */
export async function decodeImage(
	encodedMessage: string
): Promise<{ imageUrl: string; postId?: string }> {
	await initWasm();
	const decoded = decode(encodedMessage);

	// Check if there's a post ID in the decoded message
	const postIdIndex = decoded.indexOf(POST_ID_DELIMITER);
	if (postIdIndex !== -1) {
		const postIdStart = postIdIndex + POST_ID_DELIMITER.length;
		const postIdEnd = decoded.indexOf(POST_ID_END, postIdStart);
		if (postIdEnd !== -1) {
			const postId = decoded.substring(postIdStart, postIdEnd);
			const imageUrl = decoded.substring(0, postIdIndex);
			return { imageUrl, postId };
		}
	}

	return { imageUrl: decoded };
}
