import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { encryptSecret, deriveUserKey, getMasterSecret } from '$lib/encryption';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * POST /api/posts/save
 * Saves a post with encrypted secret message
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const authorization = request.headers.get('authorization');
		const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
		const supabaseServer = accessToken
			? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
					global: { headers: { Authorization: `Bearer ${accessToken}` } },
					auth: { autoRefreshToken: false, persistSession: false }
				})
			: locals.supabase;

		// Verify user with Supabase Auth server for security
		const {
			data: { user },
			error: authError
		} = await supabaseServer.auth.getUser(accessToken);

		if (authError || !user) {
			return json(
				{
					success: false,
					error: 'Unauthorized'
				},
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { post_id, content, platform, visible_message, secret_message, secret_type } = body;

		// Validate required fields
		if (!post_id || !content || !platform || !visible_message || !secret_message) {
			return json(
				{
					success: false,
					error: 'Missing required fields'
				},
				{ status: 400 }
			);
		}

		// Encrypt the secret message
		const masterSecret = getMasterSecret();
		const userKey = deriveUserKey(user.id, masterSecret);
		const encryptedSecret = encryptSecret(secret_message, userKey);

		// Save to database with encrypted secret
		const { data, error } = await supabaseServer.from('posts').insert({
			user_id: user.id,
			post_id: post_id,
			content: content,
			platform: platform,
			visible_message: visible_message,
			secret_message: encryptedSecret,
			secret_type: secret_type || 'text',
			secret_encrypted: true
		});

		if (error) {
			console.error('Database error:', {
				message: error.message,
				details: error.details,
				hint: error.hint,
				code: error.code
			});
			return json(
				{
					success: false,
					error: error.message || 'Failed to save post'
				},
				{ status: 500 }
			);
		}

		// Log creation stats to encoded_messages_tracking for all posts
		const visible_length = visible_message.length;
		const hidden_length = secret_message.length; // Pre-encryption length
		const total_length = content.length;
		const has_limited_reveals = body.has_limited_reveals || false;
		const max_reveals = body.max_reveals || null;

		const { error: trackingError } = await supabaseServer.from('encoded_messages_tracking').insert({
			user_id: user.id,
			post_id: post_id, // Use same post_id (as TEXT)
			platform: platform,
			secret_type: secret_type || 'text',
			visible_length,
			hidden_length,
			total_length,
			has_limited_reveals,
			max_reveals
		});

		if (trackingError) {
			console.error('Tracking insert error:', trackingError);
			// Don't fail the whole save, but log
		}

		// If limited reveals, create limited_secrets entry
		if (has_limited_reveals && max_reveals) {
			const { error: limitedError } = await supabaseServer.from('limited_secrets').insert({
				post_id: post_id,
				user_id: user.id,
				max_reveals,
				current_reveals: 0,
				is_expired: false
			});

			if (limitedError) {
				console.error('Limited secrets insert error:', limitedError);
			}
		}

		return json({
			success: true,
			message: 'Post saved successfully with encrypted secret'
		});
	} catch (error) {
		console.error('Error saving post:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save post'
			},
			{ status: 500 }
		);
	}
};
