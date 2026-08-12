import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { decryptSecret, deriveUserKey, getMasterSecret } from '$lib/encryption';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: corsHeaders });

/** Resolve the opaque ID embedded in a hosted Ghostpost. Possession of the ID is
 * the access mechanism, just as possession of an inline encoded post is. */
export const GET: RequestHandler = async ({ url }) => {
	const postId = url.searchParams.get('post_id');
	if (!postId) {
		return json(
			{ success: false, error: 'post_id required' },
			{ status: 400, headers: corsHeaders }
		);
	}

	const serviceKey =
		process.env.SUPABASE_SECRET_KEY ||
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY;
	if (!serviceKey) {
		console.error(
			'Hosted reveal requires SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, or PRIVATE_SUPABASE_SERVICE_ROLE_KEY'
		);
		return json(
			{ success: false, error: 'Hosted reveals are not configured' },
			{ status: 503, headers: corsHeaders }
		);
	}

	try {
		const admin = createClient(PUBLIC_SUPABASE_URL, serviceKey, {
			auth: { autoRefreshToken: false, persistSession: false }
		});
		const { data: post, error } = await admin
			.from('posts')
			.select('user_id, secret_message, secret_type, secret_encrypted')
			.eq('post_id', postId)
			.single();

		if (error || !post) {
			return json(
				{ success: false, error: 'Hosted secret not found' },
				{ status: 404, headers: corsHeaders }
			);
		}
		if (post.secret_type !== 'text') {
			return json(
				{ success: false, error: 'This hosted content type is not supported' },
				{ status: 415, headers: corsHeaders }
			);
		}

		const message = post.secret_encrypted
			? decryptSecret(post.secret_message, deriveUserKey(post.user_id, getMasterSecret()))
			: post.secret_message;

		return json({ success: true, message, postId }, { headers: corsHeaders });
	} catch (error) {
		console.error('Error revealing hosted post:', error);
		return json(
			{ success: false, error: 'Failed to reveal hosted secret' },
			{ status: 500, headers: corsHeaders }
		);
	}
};
