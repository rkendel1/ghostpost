/**
 * API Endpoint: Get Reveal Analytics
 * GET /api/limited-reveals/analytics?post_id={post_id}
 *
 * Get detailed analytics for a limited secret including reveal timeline
 * Requires authentication - only the creator can view analytics
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const post_id = url.searchParams.get('post_id');

		if (!post_id) {
			return json({ success: false, error: 'Missing post_id parameter' }, { status: 400 });
		}

		// Get limited secret record
		const { data: limitedSecret, error: secretError } = await supabase
			.from('limited_secrets')
			.select('*')
			.eq('post_id', post_id)
			.single();

		if (secretError || !limitedSecret) {
			return json(
				{
					success: false,
					error: 'Limited secret not found'
				},
				{ status: 404 }
			);
		}

		// Verify that the user is the creator of this limited secret
		if (!locals.session || limitedSecret.user_id !== locals.session.user.id) {
			return json(
				{
					success: false,
					error: 'Unauthorized - only the creator can view analytics'
				},
				{ status: 403 }
			);
		}

		// Get all reveal events
		const { data: revealEvents, error: eventsError } = await supabase
			.from('reveal_events')
			.select('*')
			.eq('post_id', post_id)
			.order('reveal_number', { ascending: true });

		if (eventsError) {
			console.error('Error fetching reveal events:', eventsError);
		}

		// Calculate analytics
		const events = revealEvents || [];
		const timeSeriesData = events.map((event) => ({
			reveal_number: event.reveal_number,
			timestamp: event.timestamp
		}));

		const remaining = limitedSecret.max_reveals
			? limitedSecret.max_reveals - limitedSecret.current_reveals
			: null;

		const percentage = limitedSecret.max_reveals
			? (limitedSecret.current_reveals / limitedSecret.max_reveals) * 100
			: null;

		return json({
			success: true,
			analytics: {
				post_id: limitedSecret.post_id,
				max_reveals: limitedSecret.max_reveals,
				current_reveals: limitedSecret.current_reveals,
				remaining_reveals: remaining,
				percentage_revealed: percentage,
				is_expired: limitedSecret.is_expired,
				created_at: limitedSecret.created_at,
				updated_at: limitedSecret.updated_at,
				reveal_timeline: timeSeriesData,
				total_events: events.length
			}
		});
	} catch (error) {
		console.error('Error getting reveal analytics:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
