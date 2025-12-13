/**
 * API Endpoint: Record Reveal
 * POST /api/limited-reveals/reveal
 *
 * Increment reveal counter and check if limit reached
 * Uses atomic database function to prevent race conditions
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { RevealResult } from '$lib/types/limited-reveals';

// CORS headers for cross-origin requests from userscript
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

// Handle OPTIONS preflight request
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders
	});
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { post_id, user_fingerprint } = await request.json();

		if (!post_id) {
			return json(
				{ success: false, error: 'Missing post_id' },
				{ status: 400, headers: corsHeaders }
			);
		}

		// Call atomic database function to increment reveal count
		// This handles all race conditions at the database level
		const { data, error } = await supabase.rpc('increment_reveal_count', {
			p_post_id: post_id,
			p_user_fingerprint: user_fingerprint || null
		});

		if (error) {
			console.error('Error calling increment_reveal_count:', error);
			return json(
				{
					success: false,
					message: 'Failed to record reveal'
				} as RevealResult,
				{ status: 500, headers: corsHeaders }
			);
		}

		// Handle response from database function
		const result = data as any;

		if (!result.success) {
			if (result.error === 'expired') {
				return json(
					{
						success: false,
						message: 'This secret has expired — all reveals are gone forever'
					} as RevealResult,
					{ status: 403, headers: corsHeaders }
				);
			}
			return json(
				{
					success: false,
					message: 'Failed to record reveal'
				} as RevealResult,
				{ status: 500, headers: corsHeaders }
			);
		}

		// For unlimited reveals
		if (result.is_unlimited) {
			return json(
				{
					success: true,
					reveal_number: null,
					total_reveals: null,
					remaining: null,
					message: 'Unlimited reveals - no tracking'
				} as RevealResult,
				{ headers: corsHeaders }
			);
		}

		// Build success message
		const revealNumber = result.reveal_number;
		const totalReveals = result.total_reveals;
		const remaining = result.remaining;

		const message = totalReveals
			? `You are reveal #${revealNumber} of ${totalReveals}${remaining ? ` — only ${remaining} left!` : ' — SOLD OUT!'}`
			: 'Reveal recorded successfully';

		return json(
			{
				success: true,
				reveal_number: revealNumber,
				total_reveals: totalReveals,
				remaining,
				message
			} as RevealResult,
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error recording reveal:', error);
		return json(
			{
				success: false,
				message: 'Internal server error'
			} as RevealResult,
			{ status: 500, headers: corsHeaders }
		);
	}
};
