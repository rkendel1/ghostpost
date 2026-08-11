import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

/**
 * Save Conversation State
 * Persists multi-turn conversations to database
 */

interface ConversationState {
	postId: string;
	aiType: string;
	messages: Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
		timestamp?: number;
	}>;
	modelUsed: string;
	createdAt: number;
	lastModified: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ConversationState;
		const { postId, aiType, messages, modelUsed, createdAt, lastModified } = body;

		if (!postId) {
			return json({ error: 'postId required' }, { status: 400 });
		}

		// Save conversation to Supabase
		const { error } = await supabase.from('conversations').upsert(
			{
				post_id: postId,
				ai_type: aiType,
				messages: messages,
				model_used: modelUsed,
				created_at: new Date(createdAt).toISOString(),
				last_modified: new Date(lastModified).toISOString(),
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'post_id' }
		);

		if (error) {
			console.error('Supabase error:', error);
			return json({ error: 'Failed to save conversation' }, { status: 500 });
		}

		return json({ success: true, postId });
	} catch (error) {
		console.error('Error saving conversation:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ url }) => {
	const postId = url.searchParams.get('post_id');

	if (!postId) {
		return json({ error: 'post_id required' }, { status: 400 });
	}

	try {
		const { data, error } = await supabase
			.from('conversations')
			.select('*')
			.eq('post_id', postId)
			.single();

		if (error && error.code !== 'PGRST116') {
			// PGRST116 is "not found" which is expected
			console.error('Supabase error:', error);
			return json({ error: 'Failed to fetch conversation' }, { status: 500 });
		}

		if (!data) {
			return json({ conversation: null });
		}

		return json({
			conversation: {
				postId: data.post_id,
				aiType: data.ai_type,
				messages: data.messages,
				modelUsed: data.model_used,
				createdAt: new Date(data.created_at).getTime(),
				lastModified: new Date(data.last_modified).getTime()
			}
		});
	} catch (error) {
		console.error('Error fetching conversation:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
};
