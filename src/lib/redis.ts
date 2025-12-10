/**
 * Redis Client for Analytics
 * Handles connection to Redis for storing and retrieving decode analytics
 */

import Redis from 'ioredis';
import { mockKv } from './mock-kv';
import { env } from '$env/dynamic/private';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any;

try {
	// Try to connect to Redis if URL is provided
	const REDIS_URL = env.REDIS_URL;
	
	if (REDIS_URL) {
		redisClient = new Redis(REDIS_URL, {
			// Connection options
			maxRetriesPerRequest: 3,
			retryStrategy(times) {
				const delay = Math.min(times * 50, 2000);
				return delay;
			},
			lazyConnect: false
		});

		// Handle connection events
		redisClient.on('error', (err: Error) => {
			console.error('Redis connection error:', err);
		});

		redisClient.on('connect', () => {
			console.log('Successfully connected to Redis');
		});

		// Wrap Redis client to match KV interface
		const redisWrapper = {
			async get<T = string>(key: string): Promise<T | null> {
				try {
					const value = await redisClient.get(key);
					if (value === null) return null;
					// Try to parse JSON, fallback to raw value
					try {
						return JSON.parse(value) as T;
					} catch {
						return value as T;
					}
				} catch (error) {
					console.error('Redis get error:', error);
					return null;
				}
			},

			async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
				try {
					const serialized = typeof value === 'string' ? value : JSON.stringify(value);
					if (options?.ex) {
						await redisClient.setex(key, options.ex, serialized);
					} else {
						await redisClient.set(key, serialized);
					}
				} catch (error) {
					console.error('Redis set error:', error);
					throw error;
				}
			},

			async incr(key: string): Promise<number> {
				try {
					return await redisClient.incr(key);
				} catch (error) {
					console.error('Redis incr error:', error);
					throw error;
				}
			},

			async exists(...keys: string[]): Promise<number> {
				try {
					return await redisClient.exists(...keys);
				} catch (error) {
					console.error('Redis exists error:', error);
					return 0;
				}
			},

			async keys(pattern: string): Promise<string[]> {
				try {
					return await redisClient.keys(pattern);
				} catch (error) {
					console.error('Redis keys error:', error);
					return [];
				}
			}
		};

		redisClient = redisWrapper;
	} else {
		throw new Error('REDIS_URL not configured');
	}
} catch (error) {
	// Fall back to mock KV for local development
	console.log('Using mock KV store for local development (Redis not configured)');
	redisClient = mockKv;
}

export { redisClient };
