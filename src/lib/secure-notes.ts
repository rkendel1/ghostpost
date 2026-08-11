/**
 * Secure Notes Service
 * End-to-end encrypted notes with configurable expiry and access control
 * Uses native Web Crypto API for AES-256-GCM encryption
 */

import type { NoteConfig, SecureNote, DecryptedNote, SecureNotePayload } from './types/secure-notes';

/**
 * Generate a random encryption key (256-bit for AES-256)
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
	return await window.crypto.subtle.generateKey(
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt', 'decrypt']
	);
}

/**
 * Export CryptoKey to raw bytes for storage
 */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
	const rawKey = await window.crypto.subtle.exportKey('raw', key);
	return new Uint8Array(rawKey);
}

/**
 * Import raw bytes back to CryptoKey
 */
export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
	return await window.crypto.subtle.importKey(
		'raw',
		rawKey,
		{ name: 'AES-GCM', length: 256 },
		true,
		['encrypt', 'decrypt']
	);
}

/**
 * Generate a random nonce (96 bits recommended for GCM)
 */
export function generateNonce(): Uint8Array {
	return window.crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Encrypt note content with AES-256-GCM
 * @param content - Plain text content to encrypt
 * @param encryptionKey - CryptoKey for encryption
 * @returns Object with encrypted content (base64) and nonce (base64)
 */
export async function encryptNote(
	content: string,
	encryptionKey: CryptoKey
): Promise<{ encrypted: string; nonce: string }> {
	const nonce = generateNonce();
	const message = new TextEncoder().encode(content);

	const ciphertext = await window.crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce },
		encryptionKey,
		message
	);

	return {
		encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
		nonce: btoa(String.fromCharCode(...nonce))
	};
}

/**
 * Decrypt note content
 * @param encryptedContent - Base64 encrypted content
 * @param nonce - Base64 nonce
 * @param encryptionKey - CryptoKey for decryption
 * @returns Decrypted plain text content
 */
export async function decryptNote(
	encryptedContent: string,
	nonce: string,
	encryptionKey: CryptoKey
): Promise<string> {
	const ciphertext = Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0));
	const nonceBuffer = Uint8Array.from(atob(nonce), (c) => c.charCodeAt(0));

	const message = await window.crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: nonceBuffer },
		encryptionKey,
		ciphertext
	);

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
