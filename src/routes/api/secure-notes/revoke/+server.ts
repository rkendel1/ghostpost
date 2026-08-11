/**
 * API Endpoint: Revoke Secure Note
 * POST /api/secure-notes/revoke
 *
 * Revokes (marks as revoked) a secure note
 * Note: Actual deletion uses soft delete (status = 'revoked')
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
		const { note_id, owner_id } = await request.json();

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

		// Check ownership (if owner_id is provided)
		if (owner_id && note.owner_id && note.owner_id !== owner_id) {
			return json(
				{ success: false, error: 'Unauthorized: You do not own this note' },
				{ status: 403, headers: corsHeaders }
			);
		}

		// Mark as revoked
		const { error: updateError } = await supabase
			.from('secure_notes')
			.update({
				status: 'revoked',
				updated_at: new Date().toISOString()
			})
			.eq('id', note_id);

		if (updateError) {
			console.error('Error revoking note:', updateError);
			return json(
				{ success: false, error: 'Failed to revoke note' },
				{ status: 500, headers: corsHeaders }
			);
		}

		return json(
			{
				success: true,
				message: 'Note has been revoked'
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error revoking secure note:', error);
		return json(
			{ success: false, error: 'Internal server error' },
			{ status: 500, headers: corsHeaders }
		);
	}
};
