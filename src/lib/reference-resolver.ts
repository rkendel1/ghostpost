/**
 * Reference Resolver Service
 * Handles detection, prefetching, and resolution of reference payloads
 * Works with the content delivery fabric to load external content
 */

import { decodeReference, prefetchReference, resolveReference } from './ghostpost';

// Regular expression for detecting invisible Unicode characters (same as in decode page)
const INVISIBLE_CHARS_REGEX = /[​‌‍‎‏‬‭⁠﻿]/;

export interface DetectedReference {
	text: string;
	startIndex: number;
	endIndex: number;
	referenceType: string;
	referenceId: string;
	metadata?: string;
}

/**
 * Scan text for invisible character patterns that might be references
 * @param text - Text to scan
 * @returns Array of detected references
 */
export function detectReferences(text: string): DetectedReference[] {
	const references: DetectedReference[] = [];

	// Split by lines/paragraphs to find segments with invisible characters
	const lines = text.split(/[\r\n]/);

	for (const line of lines) {
		if (INVISIBLE_CHARS_REGEX.test(line)) {
			// This line contains invisible characters - try to decode it
			try {
				const result = decodeReferenceSync(line);
				if (result) {
					references.push({
						text: line,
						startIndex: text.indexOf(line),
						endIndex: text.indexOf(line) + line.length,
						referenceType: result.referenceType,
						referenceId: result.referenceId,
						metadata: result.metadata
					});
				}
			} catch (error) {
				// Not a valid reference, skip
				console.debug('Invalid reference pattern:', error);
			}
		}
	}

	return references;
}

/**
 * Synchronous reference decoding (wrapper around async function)
 * Used for detection
 */
function decodeReferenceSync(text: string): {
	referenceType: string;
	referenceId: string;
	metadata?: string;
} | null {
	// This is a limitation - we need async for actual decode
	// For now, return null and rely on async decoding
	return null;
}

/**
 * Prefetch all detected references
 * Call this when page loads or content is detected
 * @param references - Array of detected references
 * @returns Promise that resolves when all prefetches complete
 */
export async function prefetchAllReferences(
	references: DetectedReference[]
): Promise<Map<string, string | Blob | null>> {
	const results = new Map<string, string | Blob | null>();

	// Prefetch in parallel with reasonable concurrency (max 3 concurrent)
	const batchSize = 3;
	for (let i = 0; i < references.length; i += batchSize) {
		const batch = references.slice(i, i + batchSize);
		const promises = batch.map(async (ref) => {
			try {
				const content = await prefetchReference(ref.referenceId, ref.referenceType);
				results.set(ref.referenceId, content);
			} catch (error) {
				console.warn(`Failed to prefetch ${ref.referenceId}:`, error);
				results.set(ref.referenceId, null);
			}
		});

		await Promise.all(promises);
	}

	return results;
}

/**
 * Resolve a reference to its content
 * Returns cached content if available, otherwise returns null
 * @param referenceId - The reference ID to resolve
 * @returns The content or null
 */
export function resolveReferenceContent(referenceId: string): string | Blob | null {
	return resolveReference(referenceId);
}

/**
 * Generate metadata JSON for a reference
 * Useful for adding tags, delivery info, or other metadata
 */
export function generateReferenceMetadata(options: {
	tags?: string[];
	category?: string;
	expiry?: string;
	fallback?: string;
	delivery?: 'instant' | 'lazy' | 'manual';
}): string {
	return JSON.stringify({
		tags: options.tags || [],
		category: options.category,
		expiry: options.expiry,
		fallback: options.fallback,
		delivery: options.delivery || 'instant',
		created: new Date().toISOString()
	});
}

/**
 * Parse reference metadata
 */
export function parseReferenceMetadata(
	metadata: string | undefined
): Record<string, any> {
	if (!metadata) return {};
	try {
		return JSON.parse(metadata);
	} catch {
		return {};
	}
}

/**
 * Create a hybrid reference with fallback content
 * Useful when external content might not be available
 */
export interface HybridReferenceOptions {
	visibleMessage: string;
	referenceType: string;
	referenceId: string;
	fallbackContent?: string;
	metadata?: string;
}

/**
 * Monitor page for invisible characters and prefetch references
 * Call this in browser extension or userscript
 */
export function setupReferencePrefetcher(
	containerElement: Element,
	onReferencesDetected?: (refs: DetectedReference[]) => void
): () => void {
	// Set up MutationObserver to watch for content changes
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'childList' || mutation.type === 'characterData') {
				const text = containerElement.textContent || '';
				const references = detectReferences(text);

				if (references.length > 0) {
					console.log('🔍 Detected', references.length, 'reference(s)');

					// Trigger prefetch
					prefetchAllReferences(references).then((results) => {
						console.log('✅ Prefetched', results.size, 'reference(s)');
					});

					// Notify listener
					if (onReferencesDetected) {
						onReferencesDetected(references);
					}
				}
			}
		}
	});

	// Start observing
	observer.observe(containerElement, {
		childList: true,
		characterData: true,
		subtree: true,
		characterDataOldValue: false
	});

	// Return cleanup function
	return () => observer.disconnect();
}
