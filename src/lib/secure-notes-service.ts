/**
 * Secure Notes Service
 * Complete client-side interaction with encrypted notes
 */

import {
	generateEncryptionKey,
	exportKey,
	importKey,
	encryptNote,
	decryptNote,
	createNoteConfig,
	generateExpiryTimestamp,
	generateRevealerFingerprint,
	isNoteExpired
} from './secure-notes';
import { encodeSecureNoteReference, decodeSecureNoteReference, initWasm } from './ghostpost';
import type { NoteConfig, SecureNote, DecryptedNote } from './types/secure-notes';

/**
 * Create and store a new secure note
 */
export async function createSecureNote(
	content: string,
	config: Partial<NoteConfig>,
	postId?: string,
	ownerId?: string
): Promise<{
	success: boolean;
	noteId?: string;
	error?: string;
}> {
	try {
		await initWasm();

		// Generate encryption key and encrypt content
		const key = await generateEncryptionKey();
		const { encrypted, nonce } = await encryptNote(content, key);

		// Export key for storage
		const rawKey = await exportKey(key);
		const keyBase64 = btoa(String.fromCharCode(...rawKey));

		// Create note config
		const noteConfig = createNoteConfig(config);

		// Create note in database
		const response = await fetch('/api/secure-notes/create', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				encrypted_content: encrypted,
				content_nonce: nonce,
				config: noteConfig,
				post_id: postId,
				owner_id: ownerId
			})
		});

		const data = await response.json();

		if (!data.success) {
			return {
				success: false,
				error: data.error || 'Failed to create note'
			};
		}

		// Store encryption key in sessionStorage (keyed by noteId)
		// Note: In production, you might want a more secure key management solution
		sessionStorage.setItem(`note-key-${data.noteId}`, keyBase64);

		return {
			success: true,
			noteId: data.noteId
		};
	} catch (error) {
		console.error('Error creating secure note:', error);
		return {
			success: false,
			error: 'Failed to create note'
		};
	}
}

/**
 * Create a visible message embedding a secure note reference
 */
export async function createSecureNoteMessage(
	visibleMessage: string,
	noteId: string,
	password?: string
): Promise<{
	success: boolean;
	encoded?: string;
	error?: string;
}> {
	try {
		await initWasm();

		const metadata = JSON.stringify({
			timestamp: new Date().toISOString(),
			type: 'secure-note'
		});

		const encoded = await encodeSecureNoteReference(
			visibleMessage,
			noteId,
			password,
			metadata
		);

		return {
			success: true,
			encoded
		};
	} catch (error) {
		console.error('Error creating secure note message:', error);
		return {
			success: false,
			error: 'Failed to encode message'
		};
	}
}

/**
 * Check if a note can be revealed
 */
export async function checkNoteStatus(noteId: string): Promise<{
	success: boolean;
	isExpired?: boolean;
	canReveal?: boolean;
	status?: any;
	error?: string;
}> {
	try {
		const response = await fetch(`/api/secure-notes/status?note_id=${noteId}`);
		const data = await response.json();

		if (!data.success) {
			return {
				success: false,
				error: data.error
			};
		}

		return {
			success: true,
			isExpired: data.status.isExpired,
			canReveal: data.status.canReveal,
			status: data.status
		};
	} catch (error) {
		console.error('Error checking note status:', error);
		return {
			success: false,
			error: 'Failed to check note status'
		};
	}
}

/**
 * Reveal and decrypt a secure note
 */
export async function revealSecureNote(
	noteId: string,
	password?: string
): Promise<{
	success: boolean;
	content?: string;
	config?: NoteConfig;
	metadata?: any;
	error?: string;
	requiresPassword?: boolean;
	canReveal?: boolean;
}> {
	try {
		// Get the fingerprint
		const fingerprint = generateRevealerFingerprint();

		// Call reveal endpoint
		const response = await fetch('/api/secure-notes/reveal', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				note_id: noteId,
				fingerprint,
				password
			})
		});

		const data = await response.json();

		if (!data.success) {
			return {
				success: false,
				error: data.error || 'Failed to reveal note',
				canReveal: data.canReveal !== false
			};
		}

		// Check if password is required but not provided
		if (data.requiresPassword && !password) {
			return {
				success: false,
				error: 'This note requires a password',
				requiresPassword: true,
				canReveal: true
			};
		}

		// Get encryption key from sessionStorage
		const keyStr = sessionStorage.getItem(`note-key-${noteId}`);
		if (!keyStr) {
			return {
				success: false,
				error: 'Encryption key not found. Note must have been created in this session.'
			};
		}

		const keyArray = Uint8Array.from(atob(keyStr), (c) => c.charCodeAt(0));
		const key = await importKey(keyArray);

		// Decrypt the content
		const decryptedContent = await decryptNote(
			data.encrypted_content,
			data.content_nonce,
			key
		);

		return {
			success: true,
			content: decryptedContent,
			config: data.config,
			metadata: {
				revealNumber: data.revealNumber,
				requiresPassword: data.requiresPassword
			}
		};
	} catch (error) {
		console.error('Error revealing secure note:', error);
		return {
			success: false,
			error: 'Failed to decrypt note'
		};
	}
}

/**
 * Revoke a secure note (soft delete)
 */
export async function revokeSecureNote(
	noteId: string,
	ownerId?: string
): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const response = await fetch('/api/secure-notes/revoke', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				note_id: noteId,
				owner_id: ownerId
			})
		});

		const data = await response.json();

		if (!data.success) {
			return {
				success: false,
				error: data.error
			};
		}

		// Clear the key from sessionStorage
		sessionStorage.removeItem(`note-key-${noteId}`);

		return { success: true };
	} catch (error) {
		console.error('Error revoking secure note:', error);
		return {
			success: false,
			error: 'Failed to revoke note'
		};
	}
}

/**
 * Decode a secure note reference from text
 */
export async function extractSecureNoteFromText(
	text: string
): Promise<{
	success: boolean;
	noteId?: string;
	password?: string;
	metadata?: any;
	error?: string;
}> {
	try {
		await initWasm();

		const result = await decodeSecureNoteReference(text);

		if (!result) {
			return {
				success: false,
				error: 'No secure note found in text'
			};
		}

		return {
			success: true,
			noteId: result.noteId,
			password: result.password,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined
		};
	} catch (error) {
		console.error('Error extracting secure note:', error);
		return {
			success: false,
			error: 'Failed to extract note reference'
		};
	}
}
