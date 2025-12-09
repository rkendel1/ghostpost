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

let wasmInitialized = false;

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
 * Encode a secret message into a visible message
 * @param visibleMessage - The message that will be shown publicly
 * @param secretMessage - The hidden message to encode
 * @returns The visible message with the secret encoded in invisible Unicode characters
 */
export async function encodeMessage(
	visibleMessage: string,
	secretMessage: string
): Promise<string> {
	await initWasm();
	return encode(visibleMessage, secretMessage);
}

/**
 * Decode a message to reveal the hidden secret
 * @param encodedMessage - The message containing the hidden secret
 * @returns The decoded secret message
 */
export async function decodeMessage(encodedMessage: string): Promise<string> {
	await initWasm();
	return decode(encodedMessage);
}

/**
 * Encode an image into a visible message
 * @param visibleMessage - The message that will be shown publicly
 * @param imageFile - The image file to encode
 * @returns The visible message with the image encoded
 */
export async function encodeImage(visibleMessage: string, imageFile: File): Promise<string> {
	await initWasm();

	// Convert image to base64
	const arrayBuffer = await imageFile.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	let binaryString = '';
	uint8Array.forEach((byte) => {
		binaryString += String.fromCharCode(byte);
	});

	const base64Image = btoa(binaryString);
	const imageWithMeta = `data:${imageFile.type};base64,${base64Image}`;

	return encode(visibleMessage, imageWithMeta);
}

/**
 * Decode an image from an encoded message
 * @param encodedMessage - The message containing the hidden image
 * @returns The decoded image as a data URL
 */
export async function decodeImage(encodedMessage: string): Promise<string> {
	await initWasm();
	return decode(encodedMessage);
}
