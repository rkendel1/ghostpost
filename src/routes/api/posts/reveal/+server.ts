import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { decryptSecret, deriveUserKey, getMasterSecret } from '$lib/encryption';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Cache-Control': 'no-store, max-age=0'
};

export const OPTIONS: RequestHandler = async () =>
	new Response(null, { status: 204, headers: corsHeaders });

/** Resolve the opaque ID embedded in a hosted Ghostpost. Possession of the ID is
 * the access mechanism, just as possession of an inline encoded post is. */
export const GET: RequestHandler = async ({ url }) => {
	let postId = url.searchParams.get('post_id');
	if (!postId) {
		return json(
			{ success: false, error: 'post_id required' },
			{ status: 400, headers: corsHeaders }
		);
	}

	// New hosted pointers contain only a 0-2.ca short code. Resolve metadata
	// without following the redirect, then accept only our own reveal endpoint.
	if (/^[0-9A-Za-z]{1,20}$/.test(postId)) {
		try {
			const shortBase = (process.env.SHORT_URL_BASE_URL || 'https://0-2.ca').replace(/\/$/, '');
			const response = await fetch(`${shortBase}/api/links/${encodeURIComponent(postId)}`, {
				signal: AbortSignal.timeout(8_000)
			});
			const link = await response.json();
			if (!response.ok || typeof link.url !== 'string') throw new Error('Short code not found');
			const destination = new URL(link.url);
			const allowedOrigin = new URL(
				process.env.GHOSTPOST_PUBLIC_URL || 'https://ghostpost-six.vercel.app'
			).origin;
			const resolvedId = destination.searchParams.get('post_id');
			if (
				destination.origin !== allowedOrigin ||
				destination.pathname !== '/api/posts/reveal' ||
				!resolvedId ||
				!/^[0-9a-f-]{36}$/i.test(resolvedId)
			) throw new Error('Short code is not a Ghostpost pointer');
			postId = resolvedId;
		} catch (error) {
			console.error('Hosted pointer resolution failed:', error);
			return json({ success: false, error: 'Hosted pointer not found' }, { status: 404, headers: corsHeaders });
		}
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
