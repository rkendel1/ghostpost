/**
 * API Endpoint: Create Secure Note
 * POST /api/secure-notes/create
 *
 * Creates a new encrypted secure note with configuration options
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { NoteConfig, SecureNote } from '$lib/types/secure-notes';

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
		const {
			encrypted_content,
			content_nonce,
			config,
			post_id,
			owner_id
		} = await request.json();

		if (!encrypted_content || !content_nonce || !config) {
			return json(
				{ success: false, error: 'Missing required fields' },
				{ status: 400, headers: corsHeaders }
			);
		}

		// Generate note ID
		const noteId = crypto.randomUUID();

		// Calculate expiry timestamp if time-based
		let expires_at: string | null = null;
		if (config.expiryType === 'time-based' && config.expiryMinutes) {
			const expiryTime = new Date(Date.now() + config.expiryMinutes * 60 * 1000);
			expires_at = expiryTime.toISOString();
		}

		// Insert secure note into database
		const { data, error } = await supabase
			.from('secure_notes')
			.insert({
				id: noteId,
				encrypted_content,
				content_nonce,
				config,
				post_id: post_id || null,
				owner_id: owner_id || null,
				status: 'active',
				expires_at,
				reveal_count: 0,
				unique_revealers: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating secure note:', error);
			return json(
				{ success: false, error: 'Failed to create secure note' },
				{ status: 500, headers: corsHeaders }
			);
		}

		return json(
			{
				success: true,
				noteId,
				note: data
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error creating secure note:', error);
		return json(
			{ success: false, error: 'Internal server error' },
			{ status: 500, headers: corsHeaders }
		);
	}
};
