import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

/**
 * Link Story Fragments
 * Establishes relationships between story fragment posts
 */

interface StoryLink {
	fragmentId: string;
	title: string;
	previousFragmentId?: string;
	nextFragmentId?: string;
	summary: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as { fragments: StoryLink[] };
		const { fragments } = body;

		if (!fragments || !Array.isArray(fragments)) {
			return json({ error: 'fragments array required' }, { status: 400 });
		}

		// Upsert all fragment links
		const { error } = await supabase.from('story_fragments').upsert(
			fragments.map((f) => ({
				post_id: f.fragmentId,
				story_title: f.title,
				previous_fragment_id: f.previousFragmentId || null,
				next_fragment_id: f.nextFragmentId || null,
				summary: f.summary,
				updated_at: new Date().toISOString()
			})),
			{ onConflict: 'post_id' }
		);

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: 'Failed to link fragments' }, { status: 500 });
		}

		return json({ success: true, count: fragments.length });
	} catch (error) {
		console.error('Error linking fragments:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
