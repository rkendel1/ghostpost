/**
 * Analytics Types
 * Data structures for tracking and displaying decode analytics
 */

export interface DecodeEvent {
	postId: string; // UUID embedded in the steganography
	timestamp: number; // Unix timestamp
	referrer?: string; // Where the user came from
	userAgent?: string; // Browser/device info
	country?: string; // From Vercel geolocation
	platform?: string; // Detected platform (twitter, instagram, etc.)
	anonymousUserId?: string; // Hashed user identifier
}

export interface PostAnalytics {
	postId: string;
	totalDecodes: number;
	uniqueUsers: Set<string>;
	decodeEvents: DecodeEvent[];
	createdAt: number;
	lastDecoded?: number;
}

export interface DashboardStats {
	postId: string;
	totalDecodes: number;
	uniqueUsers: number;
	platforms: Record<string, number>;
	countries: Record<string, number>;
	referrers: Record<string, number>;
	timeSeriesData: { timestamp: number; count: number }[];
	createdAt: number;
	lastDecoded?: number;
}

export interface PublicAnalytics {
	totalDecodes: number;
	topCountries: { country: string; count: number }[];
	platforms: Record<string, number>;
}
