/**
 * API Endpoint: Initialize Limited Secret
 * POST /api/limited-reveals/init
 * 
 * Called when creating a new GhostPost with reveal limits
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { post_id, max_reveals, user_id } = await request.json();

		if (!post_id || !user_id) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		// Validate user authorization
		if (!locals.session || user_id !== locals.session.user.id) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Create limited secret record
		const { data, error } = await locals.supabase.from('limited_secrets').insert({
			post_id,
			user_id,
			max_reveals: max_reveals || null, // null = unlimited
			current_reveals: 0,
			is_expired: false
		}).select().single();

		if (error) {
			console.error('Error initializing limited secret:', error);
			return json({ success: false, error: 'Failed to initialize limited secret' }, { status: 500 });
		}

		return json({
			success: true,
			limited_secret: data
		});
	} catch (error) {
		console.error('Error in init limited secret:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
