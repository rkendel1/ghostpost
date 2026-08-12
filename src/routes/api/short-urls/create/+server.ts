import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

const SHORT_CODE_PATTERN = /^[0-9A-Za-z]{1,20}$/;
const GHOSTPOST_SHORT_URL_IDENTITY = 'ghostpost';

/** Create an opaque short code for a hosted Ghostpost. The shortener ownership
 * fingerprint never reaches the browser. */
export const POST: RequestHandler = async ({ request, locals }) => {
	const authorization = request.headers.get('authorization');
	const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
	const supabase = accessToken
		? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { headers: { Authorization: `Bearer ${accessToken}` } },
				auth: { autoRefreshToken: false, persistSession: false }
			})
		: locals.supabase;
	const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
	if (authError || !user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	const { postId } = await request.json();
	if (typeof postId !== 'string' || !/^[0-9a-f-]{36}$/i.test(postId)) {
		return json({ success: false, error: 'Valid postId required' }, { status: 400 });
	}

	const shortBase = (process.env.SHORT_URL_BASE_URL || 'https://0-2.ca').replace(/\/$/, '');
	const appBase = (process.env.GHOSTPOST_PUBLIC_URL || 'https://ghostpost-six.vercel.app').replace(/\/$/, '');
	try {
		const response = await fetch(`${shortBase}/api/shorten`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				url: `${appBase}/api/posts/reveal?post_id=${encodeURIComponent(postId)}`,
				fingerprint: GHOSTPOST_SHORT_URL_IDENTITY
			}),
			signal: AbortSignal.timeout(12_000)
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok || !SHORT_CODE_PATTERN.test(body.shortCode || '')) {
			throw new Error(body.error || `Shortener returned ${response.status}`);
		}
		return json({ success: true, shortCode: body.shortCode });
	} catch (error) {
		console.error('Short URL creation failed:', error);
		return json({ success: false, error: 'Could not create the hosted pointer' }, { status: 502 });
	}
};
