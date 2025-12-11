/**
 * Result returned from encoding operations
 */
export interface EncodingResult {
	/** The encoded message with hidden characters */
	encoded: string;
	/** Post ID for analytics tracking (if enabled) */
	postId?: string;
	/** Length of the visible message in characters */
	visibleLength: number;
	/** Number of hidden characters added */
	hiddenLength: number;
	/** Total length of the encoded message */
	totalLength: number;
}

/**
 * Stats about encoding result
 */
export interface EncodingStats {
	visibleLength: number;
	hiddenLength: number;
	totalLength: number;
}

/**
 * Encoding result with text and stats
 */
export interface EncodingWithStats {
	text: string;
	stats: EncodingStats;
}
