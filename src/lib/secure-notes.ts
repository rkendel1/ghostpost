/**
 * Secure Notes Service
 * End-to-end encrypted notes with configurable expiry and access control
 */

import type { NoteConfig, SecureNote, DecryptedNote, SecureNotePayload } from './types/secure-notes';

// Use libsodium.js for client-side encryption
// @ts-ignore - dynamic import handling
import { ready, crypto_secretbox_easy, crypto_secretbox_open_easy, randombytes_buf } from 'libsodium.js';

let sodiumReady = false;

export async function initSodium() {
	if (!sodiumReady) {
		await ready;
		sodiumReady = true;
	}
}

/**
 * Generate a random encryption key (32 bytes for secretbox)
 */
export function generateEncryptionKey(): Uint8Array {
	return randombytes_buf(32);
}

/**
 * Generate a random nonce (24 bytes for secretbox)
 */
export function generateNonce(): Uint8Array {
	return randombytes_buf(24);
}

/**
 * Encrypt note content with client-side encryption
 * @param content - Plain text content to encrypt
 * @param encryptionKey - Encryption key (32 bytes)
 * @returns Object with encrypted content (base64) and nonce (base64)
 */
export function encryptNote(content: string, encryptionKey: Uint8Array): {
	encrypted: string;
	nonce: string;
} {
	const nonce = generateNonce();
	const message = new TextEncoder().encode(content);

	const ciphertext = crypto_secretbox_easy(message, nonce, encryptionKey);

	return {
		encrypted: btoa(String.fromCharCode(...ciphertext)),
		nonce: btoa(String.fromCharCode(...nonce))
	};
}

/**
 * Decrypt note content
 * @param encryptedContent - Base64 encrypted content
 * @param nonce - Base64 nonce
 * @param encryptionKey - Encryption key (32 bytes)
 * @returns Decrypted plain text content
 */
export function decryptNote(
	encryptedContent: string,
	nonce: string,
	encryptionKey: Uint8Array
): string {
	const ciphertext = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0));
	const nonceBuffer = Uint8Array.from(atob(nonce), (c) => c.charCodeAt(0));

	const message = crypto_secretbox_open_easy(ciphertext, nonceBuffer, encryptionKey);
	return new TextDecoder().decode(message);
}

/**
 * Create a secure note configuration
 */
export function createNoteConfig(options: Partial<NoteConfig>): NoteConfig {
	return {
		expiryType: options.expiryType || 'time-based',
		expiryMinutes: options.expiryMinutes || 24 * 60, // Default 24 hours
		requirePassword: options.requirePassword ?? false,
		singleRevealOnly: options.singleRevealOnly ?? false,
		allowSharing: options.allowSharing ?? true,
		metadata: options.metadata || {}
	};
}

/**
 * Generate expiry timestamp
 */
export function generateExpiryTimestamp(expiryMinutes: number): string {
	const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
	return expiryTime.toISOString();
}

/**
 * Check if a note is expired based on config
 */
export function isNoteExpired(note: SecureNote): boolean {
	if (note.status === 'expired' || note.status === 'revoked') {
		return true;
	}

	if (note.config.expiryType === 'single-reveal' && note.reveal_count > 0) {
		return true;
	}

	if (note.config.expiryType === 'time-based' && note.expires_at) {
		return new Date() > new Date(note.expires_at);
	}

	return false;
}

/**
 * Validate password against config
 * (Password validation happens server-side for security)
 */
export function requiresPassword(config: NoteConfig): boolean {
	return config.requirePassword ?? false;
}

/**
 * Create a payload reference to a secure note for encoding
 */
export function createSecureNotePayload(noteId: string, password?: string): SecureNotePayload {
	return {
		noteId,
		password,
		metadata: {
			timestamp: new Date().toISOString(),
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
		}
	};
}

/**
 * Serialize secure note payload to JSON (for encoding)
 */
export function serializeNotePayload(payload: SecureNotePayload): string {
	return JSON.stringify(payload);
}

/**
 * Parse secure note payload from JSON
 */
export function parseNotePayload(json: string): SecureNotePayload {
	return JSON.parse(json);
}

/**
 * Generate fingerprint for tracking unique revealers
 */
export function generateRevealerFingerprint(): string {
	const components = [
		navigator.userAgent,
		navigator.language,
		screen.width.toString(),
		screen.height.toString(),
		screen.colorDepth.toString(),
		new Date().getTimezoneOffset().toString()
	];

	const fingerprint = components.join('|');
	let hash = 0;

	for (let i = 0; i < fingerprint.length; i++) {
		const char = fingerprint.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return Math.abs(hash).toString(36);
}
