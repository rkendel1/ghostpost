/**
 * Analytics Service using Vercel KV
 * Handles storage and retrieval of decode analytics
 */

import { mockKv } from './mock-kv';
import type { DecodeEvent, DashboardStats } from '$lib/types/analytics';

// Use mock KV for development, real KV for production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kv: any;
try {
	// Try to import real KV
	const { kv: realKv } = await import('@vercel/kv');
	kv = realKv;
} catch {
	// Fall back to mock KV for local development
	console.log('Using mock KV store for local development');
	kv = mockKv;
}

const KV_PREFIX = 'analytics:';
const KV_POST_PREFIX = `${KV_PREFIX}post:`;
const KV_EVENT_PREFIX = `${KV_PREFIX}event:`;
const KV_USER_PREFIX = `${KV_PREFIX}user:`;

/**
 * Track a decode event
 */
export async function trackDecodeEvent(event: DecodeEvent): Promise<void> {
	try {
		const eventKey = `${KV_EVENT_PREFIX}${event.postId}:${event.timestamp}`;
		const postKey = `${KV_POST_PREFIX}${event.postId}`;
		const userKey = event.anonymousUserId
			? `${KV_USER_PREFIX}${event.postId}:${event.anonymousUserId}`
			: null;

		// Store the event
		await kv.set(eventKey, event, { ex: 60 * 60 * 24 * 90 }); // 90 days expiry

		// Increment post decode count
		await kv.incr(`${postKey}:count`);

		// Track unique user if provided
		if (userKey) {
			const exists = await kv.exists(userKey);
			if (!exists) {
				await kv.set(userKey, 1, { ex: 60 * 60 * 24 * 90 });
				await kv.incr(`${postKey}:unique`);
			}
		}

		// Update last decoded timestamp
		await kv.set(`${postKey}:last`, event.timestamp);

		// Store creation time if first event
		const createdExists = await kv.exists(`${postKey}:created`);
		if (!createdExists) {
			await kv.set(`${postKey}:created`, event.timestamp);
		}
	} catch (error) {
		console.error('Error tracking decode event:', error);
		throw error;
	}
}

/**
 * Get analytics for a specific post
 */
export async function getPostAnalytics(postId: string): Promise<DashboardStats | null> {
	try {
		const postKey = `${KV_POST_PREFIX}${postId}`;

		const [totalDecodes, uniqueUsers, lastDecoded, createdAt] = await Promise.all([
			kv.get<number>(`${postKey}:count`),
			kv.get<number>(`${postKey}:unique`),
			kv.get<number>(`${postKey}:last`),
			kv.get<number>(`${postKey}:created`)
		]);

		if (!totalDecodes) {
			return null;
		}

		// Get all events for this post
		const eventPattern = `${KV_EVENT_PREFIX}${postId}:*`;
		const events = await getEventsByPattern(eventPattern);

		// Process events to generate stats
		const platforms: Record<string, number> = {};
		const countries: Record<string, number> = {};
		const referrers: Record<string, number> = {};
		const timeSeriesMap: Record<number, number> = {};

		events.forEach((event) => {
			// Platform breakdown
			if (event.platform) {
				platforms[event.platform] = (platforms[event.platform] || 0) + 1;
			}

			// Country breakdown
			if (event.country) {
				countries[event.country] = (countries[event.country] || 0) + 1;
			}

			// Referrer breakdown
			if (event.referrer) {
				const domain = extractDomain(event.referrer);
				referrers[domain] = (referrers[domain] || 0) + 1;
			}

			// Time series (group by hour)
			const hourTimestamp = Math.floor(event.timestamp / (60 * 60 * 1000)) * 60 * 60 * 1000;
			timeSeriesMap[hourTimestamp] = (timeSeriesMap[hourTimestamp] || 0) + 1;
		});

		// Convert time series map to array and sort
		const timeSeriesData = Object.entries(timeSeriesMap)
			.map(([timestamp, count]) => ({
				timestamp: parseInt(timestamp),
				count
			}))
			.sort((a, b) => a.timestamp - b.timestamp);

		return {
			postId,
			totalDecodes: totalDecodes || 0,
			uniqueUsers: uniqueUsers || 0,
			platforms,
			countries,
			referrers,
			timeSeriesData,
			createdAt: createdAt || Date.now(),
			lastDecoded: lastDecoded || undefined
		};
	} catch (error) {
		console.error('Error getting post analytics:', error);
		return null;
	}
}

/**
 * Get all post IDs that have analytics
 */
export async function getAllPostIds(): Promise<string[]> {
	try {
		// This is a simplified implementation
		// In production, you might want to maintain a separate index of post IDs
		const keys = await kv.keys(`${KV_POST_PREFIX}*:count`);
		return keys.map((key) => key.replace(`${KV_POST_PREFIX}`, '').replace(':count', ''));
	} catch (error) {
		console.error('Error getting all post IDs:', error);
		return [];
	}
}

/**
 * Get public aggregate analytics
 */
export async function getPublicAnalytics(): Promise<{
	totalDecodes: number;
	topCountries: { country: string; count: number }[];
	platforms: Record<string, number>;
}> {
	try {
		const postIds = await getAllPostIds();
		let totalDecodes = 0;
		const allCountries: Record<string, number> = {};
		const allPlatforms: Record<string, number> = {};

		for (const postId of postIds) {
			const stats = await getPostAnalytics(postId);
			if (stats) {
				totalDecodes += stats.totalDecodes;

				// Aggregate countries
				Object.entries(stats.countries).forEach(([country, count]) => {
					allCountries[country] = (allCountries[country] || 0) + count;
				});

				// Aggregate platforms
				Object.entries(stats.platforms).forEach(([platform, count]) => {
					allPlatforms[platform] = (allPlatforms[platform] || 0) + count;
				});
			}
		}

		// Get top countries
		const topCountries = Object.entries(allCountries)
			.map(([country, count]) => ({ country, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			totalDecodes,
			topCountries,
			platforms: allPlatforms
		};
	} catch (error) {
		console.error('Error getting public analytics:', error);
		return {
			totalDecodes: 0,
			topCountries: [],
			platforms: {}
		};
	}
}

/**
 * Helper: Get events by pattern (simplified - in production use pagination)
 */
async function getEventsByPattern(pattern: string): Promise<DecodeEvent[]> {
	try {
		const keys = await kv.keys(pattern);
		const events: DecodeEvent[] = [];

		// Fetch in batches to avoid overwhelming the system
		const batchSize = 100;
		for (let i = 0; i < keys.length; i += batchSize) {
			const batch = keys.slice(i, i + batchSize);
			const batchEvents = await Promise.all(batch.map((key) => kv.get<DecodeEvent>(key)));
			events.push(...batchEvents.filter((e): e is DecodeEvent => e !== null));
		}

		return events;
	} catch (error) {
		console.error('Error getting events by pattern:', error);
		return [];
	}
}

/**
 * Helper: Extract domain from URL
 */
function extractDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		return 'direct';
	}
}

/**
 * Helper: Detect platform from referrer and user agent
 */
export function detectPlatform(referrer?: string, userAgent?: string): string {
	if (!referrer && !userAgent) return 'unknown';

	const refLower = referrer?.toLowerCase() || '';
	const uaLower = userAgent?.toLowerCase() || '';

	if (refLower.includes('twitter.com') || refLower.includes('t.co') || uaLower.includes('twitter')) {
		return 'twitter';
	}
	if (refLower.includes('facebook.com') || refLower.includes('fb.com')) {
		return 'facebook';
	}
	if (refLower.includes('instagram.com')) {
		return 'instagram';
	}
	if (refLower.includes('linkedin.com')) {
		return 'linkedin';
	}
	if (refLower.includes('tiktok.com')) {
		return 'tiktok';
	}
	if (refLower.includes('discord.com') || refLower.includes('discord.gg')) {
		return 'discord';
	}
	if (refLower.includes('reddit.com')) {
		return 'reddit';
	}
	if (refLower.includes('telegram')) {
		return 'telegram';
	}

	return 'other';
}

/**
 * Generate a simple anonymous user ID from request headers
 */
export function generateAnonymousUserId(
	userAgent?: string,
	ipAddress?: string,
	fingerprint?: string
): string {
	const data = `${userAgent || ''}:${ipAddress || ''}:${fingerprint || ''}`;
	// Simple hash function (in production, use a proper crypto hash)
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		const char = data.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36);
}
