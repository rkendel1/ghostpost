import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

/**
 * GET /api/dashboard/top-posts
 * Get user's top performing posts
 */
export const GET: RequestHandler = async ({ locals, url }) => {
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

		const limit = parseInt(url.searchParams.get('limit') || '10');

		// Get all user's posts
		const { data: posts, error: postsError } = await supabase
			.from('posts')
			.select('*')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (postsError) throw postsError;

		// Get limited reveals data for each post
		const postsWithStats = (
			await Promise.all(
				(posts || []).map(async (post) => {
					const { data: limitedReveal, error: lrError } = await supabase
						.from('limited_secrets')
						.select('current_reveals, max_reveals, is_expired')
						.eq('post_id', post.post_id)
						.single();

					// If error (other than not found), skip this post
					if (lrError && lrError.code !== 'PGRST116') {
						console.error('Error fetching limited reveal:', lrError);
						return null;
					}

					return {
						...post,
						decodes: limitedReveal?.current_reveals || 0,
						max_reveals: limitedReveal?.max_reveals || null,
						is_expired: limitedReveal?.is_expired || false
					};
				})
			)
		).filter((post): post is NonNullable<typeof post> => post !== null);

		// Sort by decodes (descending) and take top N
		const topPosts = postsWithStats.sort((a, b) => b.decodes - a.decodes).slice(0, limit);

		return json({
			success: true,
			posts: topPosts
		});
	} catch (error) {
		console.error('Error getting top posts:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get top posts'
			},
			{ status: 500 }
		);
	}
};
