import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

/**
 * Retrieve Story Fragments
 * Gets all fragments of a story in order
 */

export const GET: RequestHandler = async ({ url }) => {
	const title = url.searchParams.get('title');

	if (!title) {
		return json({ error: 'title required' }, { status: 400 });
	}

	try {
		// Find the first fragment (no previous_fragment_id)
		const { data: firstFragment, error: firstError } = await supabase
			.from('story_fragments')
			.select('*')
			.eq('story_title', title)
			.is('previous_fragment_id', null)
			.single();

		if (firstError && firstError.code !== 'PGRST116') {
			console.error('Supabase error:', firstError);
			return json({ error: 'Failed to retrieve story' }, { status: 500 });
		}

		if (!firstFragment) {
			return json({ fragments: [] });
		}

		// Build the chain of fragments
		const fragments = [firstFragment];
		let currentId = firstFragment.next_fragment_id;

		// Follow the chain (limit to 100 fragments to prevent infinite loops)
		for (let i = 0; i < 100 && currentId; i++) {
			const { data: nextFragment, error } = await supabase
				.from('story_fragments')
				.select('*')
				.eq('post_id', currentId)
				.single();

			if (error || !nextFragment) break;

			fragments.push(nextFragment);
			currentId = nextFragment.next_fragment_id;
		}

		return json({
			title,
			fragmentCount: fragments.length,
			fragments: fragments.map((f) => ({
				postId: f.post_id,
				summary: f.summary,
				order: fragments.indexOf(f) + 1
			}))
		});
	} catch (error) {
		console.error('Error retrieving story:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
