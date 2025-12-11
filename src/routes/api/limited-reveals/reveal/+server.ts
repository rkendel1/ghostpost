/**
 * API Endpoint: Record Reveal
 * POST /api/limited-reveals/reveal
 * 
 * Increment reveal counter and check if limit reached
 * This should be called atomically when someone decodes a message
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { RevealResult } from '$lib/types/limited-reveals';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { post_id, user_fingerprint } = await request.json();

		if (!post_id) {
			return json({ success: false, error: 'Missing post_id' }, { status: 400 });
		}

		// Get limited secret record
		const { data: limitedSecret, error: fetchError } = await supabase
			.from('limited_secrets')
			.select('*')
			.eq('post_id', post_id)
			.single();

		// If no record exists, this is an unlimited post - allow reveal
		if (fetchError || !limitedSecret) {
			return json({
				success: true,
				reveal_number: null,
				total_reveals: null,
				remaining: null,
				message: 'Unlimited reveals - no tracking'
			} as RevealResult);
		}

		// Check if already expired
		if (limitedSecret.is_expired) {
			return json({
				success: false,
				message: 'This secret has expired — all reveals are gone forever'
			} as RevealResult, { status: 403 });
		}

		// Check if limit already reached
		if (limitedSecret.max_reveals && limitedSecret.current_reveals >= limitedSecret.max_reveals) {
			// Mark as expired
			await supabase
				.from('limited_secrets')
				.update({ is_expired: true, updated_at: new Date().toISOString() })
				.eq('post_id', post_id);

			return json({
				success: false,
				message: 'This secret has expired — all reveals are gone forever'
			} as RevealResult, { status: 403 });
		}

		// Increment reveal counter atomically
		const newRevealCount = limitedSecret.current_reveals + 1;
		const isNowExpired = limitedSecret.max_reveals && newRevealCount >= limitedSecret.max_reveals;

		const { error: updateError } = await supabase
			.from('limited_secrets')
			.update({
				current_reveals: newRevealCount,
				is_expired: isNowExpired,
				updated_at: new Date().toISOString()
			})
			.eq('post_id', post_id)
			.eq('current_reveals', limitedSecret.current_reveals); // Optimistic locking

		if (updateError) {
			console.error('Error updating reveal count:', updateError);
			return json({
				success: false,
				message: 'Failed to record reveal'
			} as RevealResult, { status: 500 });
		}

		// Record reveal event
		await supabase.from('reveal_events').insert({
			post_id,
			reveal_number: newRevealCount,
			timestamp: new Date().toISOString(),
			user_fingerprint
		});

		const remaining = limitedSecret.max_reveals ? limitedSecret.max_reveals - newRevealCount : null;

		return json({
			success: true,
			reveal_number: newRevealCount,
			total_reveals: limitedSecret.max_reveals,
			remaining,
			message: limitedSecret.max_reveals 
				? `You are reveal #${newRevealCount} of ${limitedSecret.max_reveals}${remaining ? ` — only ${remaining} left!` : ' — SOLD OUT!'}`
				: 'Reveal recorded successfully'
		} as RevealResult);
	} catch (error) {
		console.error('Error recording reveal:', error);
		return json({
			success: false,
			message: 'Internal server error'
		} as RevealResult, { status: 500 });
	}
};
