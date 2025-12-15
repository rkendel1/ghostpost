import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

/**
 * Encryption utilities for protecting secret messages
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives an encryption key from a user's ID and a master secret
 * Uses scrypt for key derivation with cryptographically secure salt
 */
export function deriveUserKey(userId: string, masterSecret: string): Buffer {
	// Use a hash of the userId as salt to ensure uniqueness while avoiding patterns
	const saltSource = createHash('sha256').update(userId).digest();
	const salt = saltSource.subarray(0, SALT_LENGTH);
	return scryptSync(masterSecret, salt, KEY_LENGTH);
}

/**
 * Encrypts a secret message using AES-256-GCM
 * Returns hex-encoded string with format: iv:authTag:encryptedData
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
	if (!plaintext) {
		return '';
	}

	// Generate a random initialization vector
	const iv = randomBytes(IV_LENGTH);

	// Create cipher
	const cipher = createCipheriv(ALGORITHM, key, iv);

	// Encrypt the data
	let encrypted = cipher.update(plaintext, 'utf8', 'hex');
	encrypted += cipher.final('hex');

	// Get the authentication tag
	const authTag = cipher.getAuthTag();

	// Combine iv, authTag, and encrypted data
	// Format: iv:authTag:encryptedData (all in hex)
	return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a secret message encrypted with encryptSecret
 * Expects hex-encoded string with format: iv:authTag:encryptedData
 */
export function decryptSecret(encryptedData: string, key: Buffer): string {
	if (!encryptedData) {
		return '';
	}

	try {
		// Split the encrypted data into components
		const parts = encryptedData.split(':');
		if (parts.length !== 3) {
			throw new Error('Invalid encrypted data format');
		}

		const iv = Buffer.from(parts[0], 'hex');
		const authTag = Buffer.from(parts[1], 'hex');
		const encrypted = parts[2];

		// Create decipher
		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		// Decrypt the data
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return decrypted;
	} catch (error) {
		console.error('Decryption error:', error);
		throw new Error('Failed to decrypt secret');
	}
}

/**
 * Hashes a secret message for verification without revealing the content
 * Uses SHA-256 for one-way hashing
 */
export function hashSecret(secret: string): string {
	return createHash('sha256').update(secret).digest('hex');
}

/**
 * Gets the master encryption secret from environment
 * In production, this should be a strong random secret stored securely
 */
export function getMasterSecret(): string {
	// Check for environment variable
	const secret = process.env.ENCRYPTION_MASTER_SECRET;

	if (!secret) {
		// In development, use a default (NOT FOR PRODUCTION!)
		if (process.env.NODE_ENV === 'development') {
			console.warn(
				'⚠️  Using default encryption secret. Set ENCRYPTION_MASTER_SECRET in production!'
			);
			return 'development-secret-key-change-in-production-for-security';
		}
		throw new Error('ENCRYPTION_MASTER_SECRET environment variable is required');
	}

	return secret;
}
