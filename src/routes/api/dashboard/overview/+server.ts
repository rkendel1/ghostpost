import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

/**
 * GET /api/dashboard/overview
 * Get aggregate dashboard statistics for authenticated user
 */
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Get user from session
		const session = locals.session;
		const user = session?.user;

		if (!user) {
			return json(
				{
					success: false,
					error: 'Unauthorized'
				},
				{ status: 401 }
			);
		}

		// Get total posts count
		const { count: totalPosts, error: postsError } = await supabase
			.from('posts')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id);

		if (postsError) throw postsError;

		// Get all user's posts to calculate aggregated stats
		const { data: posts, error: postsDataError } = await supabase
			.from('posts')
			.select('post_id')
			.eq('user_id', user.id);

		if (postsDataError) throw postsDataError;

		// Get limited reveals data
		const { data: limitedReveals, error: limitedRevealsError } = await supabase
			.from('limited_secrets')
			.select('current_reveals, max_reveals, is_expired')
			.in(
				'post_id',
				posts?.map((p) => p.post_id) || []
			);

		if (limitedRevealsError && limitedRevealsError.code !== 'PGRST116') {
			throw limitedRevealsError;
		}

		// Calculate aggregated stats
		let totalDecodes = 0;
		let activePosts = 0;
		let expiredPosts = 0;

		// Count posts with limited reveals
		limitedReveals?.forEach((lr) => {
			totalDecodes += lr.current_reveals || 0;
			if (lr.is_expired) {
				expiredPosts++;
			} else {
				// Active if not expired (includes both limited and unlimited reveals)
				activePosts++;
			}
		});

		// Add posts without limited reveals (unlimited posts) to active count
		const postsWithLimitedReveals = new Set(limitedReveals?.map((lr) => lr.post_id) || []);
		const unlimitedPostsCount =
			(posts?.length || 0) - (limitedReveals?.length || 0);
		activePosts += unlimitedPostsCount;

		// Get encoded messages tracking data - use posts table for platform distribution
		const platformCounts: Record<string, number> = {};
		posts?.forEach((post) => {
			platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
		});

		// Get recent activity (last 7 days)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const { count: recentPosts, error: recentPostsError } = await supabase
			.from('posts')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', user.id)
			.gte('created_at', sevenDaysAgo.toISOString());

		if (recentPostsError) throw recentPostsError;

		return json({
			success: true,
			overview: {
				totalPosts: totalPosts || 0,
				totalDecodes,
				activePosts,
				expiredPosts,
				recentPosts: recentPosts || 0,
				platformDistribution: platformCounts,
				limitedRevealsPosts: limitedReveals?.length || 0
			}
		});
	} catch (error) {
		console.error('Error getting dashboard overview:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get dashboard overview'
			},
			{ status: 500 }
		);
	}
};
