import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ url }) => {
	const postId = url.searchParams.get('post_id');

	if (!postId) {
		return json({ error: 'post_id required' }, { status: 400 });
	}

	try {
		// Fetch post from Supabase
		const { data, error } = await supabase
			.from('posts')
			.select('encoded_message, visible_message, created_at')
			.eq('id', postId)
			.single();

		if (error || !data) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		return json({
			content: data.encoded_message,
			visible: data.visible_message,
			created: data.created_at
		});
	} catch (error) {
		console.error('Error fetching post:', error);
		return json({ error: 'Failed to fetch post' }, { status: 500 });
	}
};
