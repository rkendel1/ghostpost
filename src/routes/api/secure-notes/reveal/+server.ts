/**
 * API Endpoint: Reveal Secure Note
 * POST /api/secure-notes/reveal
 *
 * Records a reveal event and returns the encrypted note if not expired
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders
	});
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { note_id, fingerprint, password } = await request.json();

		if (!note_id) {
			return json(
				{ success: false, error: 'Missing note_id' },
				{ status: 400, headers: corsHeaders }
			);
		}

		// Get the note
		const { data: note, error: noteError } = await supabase
			.from('secure_notes')
			.select('*')
			.eq('id', note_id)
			.single();

		if (noteError || !note) {
			return json(
				{ success: false, error: 'Note not found' },
				{ status: 404, headers: corsHeaders }
			);
		}

		// Check if expired
		if (note.status === 'expired' || note.status === 'revoked') {
			return json(
				{ success: false, error: 'This note has expired' },
				{ status: 403, headers: corsHeaders }
			);
		}

		if (note.config.expiryType === 'time-based' && note.expires_at) {
			if (new Date() > new Date(note.expires_at)) {
				// Mark as expired
				await supabase
					.from('secure_notes')
					.update({ status: 'expired' })
					.eq('id', note_id);

				return json(
					{ success: false, error: 'This note has expired' },
					{ status: 403, headers: corsHeaders }
				);
			}
		}

		// Check single-reveal constraint
		if (note.config.expiryType === 'single-reveal' && note.reveal_count > 0) {
			// Mark as expired
			await supabase
				.from('secure_notes')
				.update({ status: 'expired' })
				.eq('id', note_id);

			return json(
				{ success: false, error: 'This note has already been revealed' },
				{ status: 403, headers: corsHeaders }
			);
		}

		// Check if already revealed by this user (for single-reveal)
		if (note.config.singleRevealOnly && fingerprint) {
			const { data: existingReveal } = await supabase
				.from('note_reveal_records')
				.select('id')
				.eq('note_id', note_id)
				.eq('revealer_fingerprint', fingerprint)
				.limit(1);

			if (existingReveal && existingReveal.length > 0) {
				return json(
					{
						success: false,
						error: 'You have already revealed this note',
						canReveal: false
					},
					{ status: 403, headers: corsHeaders }
				);
			}
		}

		// Record the reveal
		if (fingerprint) {
			const { error: revealError } = await supabase
				.from('note_reveal_records')
				.insert({
					note_id,
					revealer_fingerprint: fingerprint,
					revealed_at: new Date().toISOString()
				});

			if (revealError) {
				console.error('Error recording reveal:', revealError);
			}
		}

		// Increment reveal count
		const newRevealCount = note.reveal_count + 1;
		await supabase
			.from('secure_notes')
			.update({
				reveal_count: newRevealCount,
				updated_at: new Date().toISOString()
			})
			.eq('id', note_id);

		// For single-reveal, mark as expired after incrementing
		if (note.config.expiryType === 'single-reveal') {
			await supabase
				.from('secure_notes')
				.update({ status: 'expired' })
				.eq('id', note_id);
		}

		return json(
			{
				success: true,
				encrypted_content: note.encrypted_content,
				content_nonce: note.content_nonce,
				requiresPassword: note.config.requirePassword || false,
				revealNumber: newRevealCount,
				config: note.config
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error revealing secure note:', error);
		return json(
			{ success: false, error: 'Internal server error' },
			{ status: 500, headers: corsHeaders }
		);
	}
};
