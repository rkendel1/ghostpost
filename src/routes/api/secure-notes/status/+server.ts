/**
 * API Endpoint: Check Secure Note Status
 * GET /api/secure-notes/status?note_id={id}
 *
 * Check if a note can be revealed and get its current status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders
	});
};

export const GET: RequestHandler = async ({ url }) => {
	try {
		const note_id = url.searchParams.get('note_id');

		if (!note_id) {
			return json(
				{ success: false, error: 'Missing note_id parameter' },
				{ status: 400, headers: corsHeaders }
			);
		}

		// Get the note
		const { data: note, error } = await supabase
			.from('secure_notes')
			.select('*')
			.eq('id', note_id)
			.single();

		if (error || !note) {
			return json(
				{ success: false, error: 'Note not found' },
				{ status: 404, headers: corsHeaders }
			);
		}

		// Determine if expired
		let isExpired = note.status === 'expired' || note.status === 'revoked';

		if (note.config.expiryType === 'time-based' && note.expires_at) {
			isExpired = isExpired || new Date() > new Date(note.expires_at);
		}

		if (note.config.expiryType === 'single-reveal') {
			isExpired = isExpired || note.reveal_count > 0;
		}

		const canReveal = !isExpired;

		return json(
			{
				success: true,
				status: {
					note_id,
					status: note.status,
					isExpired,
					canReveal,
					revealCount: note.reveal_count,
					uniqueRevealers: note.unique_revealers,
					expiryType: note.config.expiryType,
					expiresAt: note.expires_at,
					requiresPassword: note.config.requirePassword || false,
					singleRevealOnly: note.config.singleRevealOnly || false
				}
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error checking note status:', error);
		return json(
			{ success: false, error: 'Internal server error' },
			{ status: 500, headers: corsHeaders }
		);
	}
};
