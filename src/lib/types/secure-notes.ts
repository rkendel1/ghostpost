/**
 * Secure Notes Types
 * End-to-end encrypted notes with ephemeral and configurability
 */

export type NoteExpiryType = 'single-reveal' | 'time-based' | 'never';
export type NoteStatus = 'active' | 'expired' | 'revoked';

export interface NoteConfig {
	expiryType: NoteExpiryType;
	expiryMinutes?: number; // For time-based expiry
	requirePassword?: boolean;
	passwordHash?: string; // bcrypt hash
	singleRevealOnly?: boolean; // Auto-expire after first view
	allowSharing?: boolean; // Can the revealer share it again?
	metadata?: Record<string, string>; // Custom metadata
}

export interface SecureNote {
	id: string; // UUID
	post_id?: string; // Associated post ID if embedded
	owner_id?: string; // User ID who created it
	encrypted_content: string; // Base64 encrypted payload
	content_nonce: string; // Encryption nonce (base64)
	config: NoteConfig;
	status: NoteStatus;
	created_at: string;
	updated_at: string;
	expires_at?: string; // For time-based expiry
	reveal_count: number;
	unique_revealers: number;
}

export interface NoteRevealRecord {
	id: string;
	note_id: string;
	revealer_fingerprint: string;
	revealed_at: string;
	ip_country?: string;
}

export interface DecryptedNote {
	content: string; // Plain text decrypted content
	config: NoteConfig;
	metadata: {
		revealCount: number;
		uniqueRevealers: number;
		isExpired: boolean;
		canReveal: boolean;
		remainingReveals?: number;
		expiresAt?: string;
	};
}

export interface SecureNotePayload {
	noteId: string; // Reference to the encrypted note
	password?: string; // Optional password for decryption
	metadata?: Record<string, string>; // Context metadata
}
