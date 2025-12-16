import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPostAnalytics } from '$lib/analytics';

/**
 * GET /api/analytics/post?postId=xxx
 * Get analytics for a specific post
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const postId = url.searchParams.get('postId');

		if (!postId) {
			return json(
				{
					success: false,
					error: 'postId is required'
				},
				{ status: 400 }
			);
		}

		const analytics = await getPostAnalytics(postId);

		if (!analytics) {
			return json({
				success: true,
				analytics: null
			});
		}

		return json({
			success: true,
			analytics
		});
	} catch (error) {
		console.error('Error getting post analytics:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get analytics'
			},
			{ status: 500 }
		);
	}
};
