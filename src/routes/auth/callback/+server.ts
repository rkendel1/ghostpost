import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') ?? '/dashboard';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			throw redirect(303, next);
		}

		// Log error for debugging but redirect to home to allow user to retry
		console.error('OAuth callback error:', error);
	}

	// If there was an error or no code, redirect to home
	throw redirect(303, '/');
};
