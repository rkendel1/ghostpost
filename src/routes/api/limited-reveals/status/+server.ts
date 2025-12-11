/**
 * API Endpoint: Get Reveal Status
 * GET /api/limited-reveals/status?post_id={post_id}
 *
 * Check if a secret can be revealed and get current status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { RevealStatus } from '$lib/types/limited-reveals';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const post_id = url.searchParams.get('post_id');

		if (!post_id) {
			return json({ success: false, error: 'Missing post_id parameter' }, { status: 400 });
		}

		// Get limited secret record
		const { data: limitedSecret, error } = await supabase
			.from('limited_secrets')
			.select('*')
			.eq('post_id', post_id)
			.single();

		// If no record exists, this is an unlimited post
		if (error || !limitedSecret) {
			return json({
				success: true,
				status: {
					post_id,
					max_reveals: null,
					current_reveals: 0,
					is_expired: false,
					remaining_reveals: null,
					percentage_revealed: null,
					can_reveal: true
				} as RevealStatus
			});
		}

		const remaining = limitedSecret.max_reveals
			? limitedSecret.max_reveals - limitedSecret.current_reveals
			: null;

		const percentage = limitedSecret.max_reveals
			? (limitedSecret.current_reveals / limitedSecret.max_reveals) * 100
			: null;

		const canReveal =
			!limitedSecret.is_expired &&
			(!limitedSecret.max_reveals || limitedSecret.current_reveals < limitedSecret.max_reveals);

		const status: RevealStatus = {
			post_id: limitedSecret.post_id,
			max_reveals: limitedSecret.max_reveals,
			current_reveals: limitedSecret.current_reveals,
			is_expired: limitedSecret.is_expired,
			remaining_reveals: remaining,
			percentage_revealed: percentage,
			can_reveal: canReveal
		};

		return json({
			success: true,
			status
		});
	} catch (error) {
		console.error('Error getting reveal status:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
