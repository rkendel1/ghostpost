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

let wasmInitialized = false;

// Delimiter for post ID in the secret payload
const POST_ID_DELIMITER = '||ghostid:';
const POST_ID_END = '||';

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
 * @returns Object with encoded message and postId (if analytics enabled)
 */
export async function encodeMessage(
	visibleMessage: string,
	secretMessage: string,
	enableAnalytics = true
): Promise<{ encoded: string; postId?: string }> {
	await initWasm();

	let finalSecret = secretMessage;
	let postId: string | undefined;

	// Add post ID to secret if analytics enabled
	if (enableAnalytics) {
		postId = uuidv4();
		finalSecret = `${secretMessage}${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, finalSecret);
	return { encoded, postId };
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
 * Encode an image into a visible message with analytics tracking
 * @param visibleMessage - The message that will be shown publicly
 * @param imageFile - The image file to encode
 * @param enableAnalytics - Whether to include a tracking ID (default: true)
 * @returns Object with encoded message and postId (if analytics enabled)
 */
export async function encodeImage(
	visibleMessage: string,
	imageFile: File,
	enableAnalytics = true
): Promise<{ encoded: string; postId?: string }> {
	await initWasm();

	// Convert image to base64
	const arrayBuffer = await imageFile.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	let binaryString = '';
	uint8Array.forEach((byte) => {
		binaryString += String.fromCharCode(byte);
	});

	const base64Image = btoa(binaryString);
	let imageWithMeta = `data:${imageFile.type};base64,${base64Image}`;

	let postId: string | undefined;

	// Add post ID to secret if analytics enabled
	if (enableAnalytics) {
		postId = uuidv4();
		imageWithMeta = `${imageWithMeta}${POST_ID_DELIMITER}${postId}${POST_ID_END}`;
	}

	const encoded = encode(visibleMessage, imageWithMeta);
	return { encoded, postId };
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
