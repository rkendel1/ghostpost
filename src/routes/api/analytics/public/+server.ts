import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicAnalytics } from '$lib/analytics';

/**
 * GET /api/analytics/public
 * Get aggregate public analytics across all posts
 */
export const GET: RequestHandler = async () => {
	try {
		const analytics = await getPublicAnalytics();

		return json({
			success: true,
			analytics
		});
	} catch (error) {
		console.error('Error getting public analytics:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get public analytics'
			},
			{ status: 500 }
		);
	}
};
