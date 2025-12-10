/**
 * Mock KV Store for Local Development
 * When Vercel KV is not available (local dev), use in-memory storage
 */

let mockStore: Map<string, { value: any; expiry?: number }> = new Map();

export const mockKv = {
	async get<T = any>(key: string): Promise<T | null> {
		const item = mockStore.get(key);
		if (!item) return null;
		if (item.expiry && Date.now() > item.expiry) {
			mockStore.delete(key);
			return null;
		}
		return item.value as T;
	},

	async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
		const expiry = options?.ex ? Date.now() + options.ex * 1000 : undefined;
		mockStore.set(key, { value, expiry });
	},

	async incr(key: string): Promise<number> {
		const current = (await this.get<number>(key)) || 0;
		const newValue = current + 1;
		await this.set(key, newValue);
		return newValue;
	},

	async exists(...keys: string[]): Promise<number> {
		let count = 0;
		for (const key of keys) {
			if (mockStore.has(key)) count++;
		}
		return count;
	},

	async keys(pattern: string): Promise<string[]> {
		const regexPattern = pattern.replace(/\*/g, '.*');
		const regex = new RegExp(`^${regexPattern}$`);
		return Array.from(mockStore.keys()).filter((key) => regex.test(key));
	},

	// Clear all mock data (for testing)
	clear(): void {
		mockStore.clear();
	}
};
