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
// Target 25KB to stay well under 40k character limit after base64 encoding
// 25KB * 1.33 (base64 overhead) ≈ 33KB base64 ≈ 33k hidden characters
const MAX_IMAGE_SIZE_KB = 25;
const MAX_IMAGE_WIDTH = 600;
const MAX_IMAGE_HEIGHT = 600;
const QUALITY_LEVELS = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];

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
 * @param maxSizeKB - Maximum size in KB (default: 25KB)
 * @param maxWidth - Maximum width in pixels (default: 600)
 * @param maxHeight - Maximum height in pixels (default: 600)
 * @returns Promise<File> - The processed image file
 */
async function resizeImageIfNeeded(
	file: File,
	maxSizeKB: number = MAX_IMAGE_SIZE_KB,
	maxWidth: number = MAX_IMAGE_WIDTH,
	maxHeight: number = MAX_IMAGE_HEIGHT
): Promise<File> {
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

			// Always resize to maxWidth/maxHeight if image is larger
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

			// Try different quality settings and dimensions to get under the size limit
			const tryQuality = (quality: number, scaleFactor: number = 1.0): Promise<Blob | null> => {
				return new Promise((resolve, reject) => {
					const scaledWidth = Math.floor(width * scaleFactor);
					const scaledHeight = Math.floor(height * scaleFactor);
					
					// Create a new canvas with scaled dimensions if needed
					const finalCanvas = scaleFactor < 1.0 ? document.createElement('canvas') : canvas;
					if (scaleFactor < 1.0) {
						finalCanvas.width = scaledWidth;
						finalCanvas.height = scaledHeight;
						const finalCtx = finalCanvas.getContext('2d');
						if (!finalCtx) {
							reject(new Error('Failed to get canvas context for scaled image'));
							return;
						}
						finalCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
					}
					
					// Always convert to JPEG for better compression
					finalCanvas.toBlob(
						(blob) => {
							if (blob && blob.size <= maxSizeKB * 1024) {
								resolve(blob);
							} else {
								resolve(null);
							}
						},
						'image/jpeg',
						quality
					);
				});
			};

			// Try progressively lower quality and dimensions until we get under the size limit
			(async () => {
				try {
					// First try different quality levels at full resolution
					for (const quality of QUALITY_LEVELS) {
						const blob = await tryQuality(quality, 1.0);
						if (blob) {
							const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
								type: 'image/jpeg',
								lastModified: Date.now()
							});
							resolve(newFile);
							return;
						}
					}
					
					// If still too large, try reducing dimensions with lowest quality
					const scaleFactors = [0.9, 0.8, 0.7, 0.6, 0.5];
					for (const scale of scaleFactors) {
						const blob = await tryQuality(QUALITY_LEVELS[QUALITY_LEVELS.length - 1], scale);
						if (blob) {
							const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
								type: 'image/jpeg',
								lastModified: Date.now()
							});
							resolve(newFile);
							return;
						}
					}
					
					// If still too large, reject with error
					reject(
						new Error(
							`Image is too large to compress to ${maxSizeKB}KB. Please use a smaller or simpler image.`
						)
					);
				} catch (err) {
					reject(err);
				}
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

	// Resize and compress image aggressively to stay under platform character limits
	// Maximum 25KB to keep encoded strings under 40k characters
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
