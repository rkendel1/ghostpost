import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerClient } from '@supabase/ssr';
import { encryptSecret, deriveUserKey, getMasterSecret } from '$lib/encryption';

/**
 * POST /api/posts/save
 * Saves a post with encrypted secret message
 */
export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Get user from session
		const session = locals.session;

		// Create server Supabase client
		const supabaseServer = createServerClient(
			process.env.SUPABASE_URL!,
			process.env.SUPABASE_ANON_KEY!,
			{
				cookies: {
					get(name) {
						return cookies.get(name);
					},
					set(name, value, options) {
						cookies.set(name, value, { ...options, path: '/' });
					},
					remove(name, options) {
						cookies.delete(name, { ...options, path: '/' });
					}
				}
			}
		);

		// Verify user with Supabase Auth server for security
		const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

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
