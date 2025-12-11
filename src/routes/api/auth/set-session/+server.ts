import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { access_token, refresh_token } = await request.json();

		if (!access_token || !refresh_token) {
			return json({ success: false, error: 'Missing access or refresh token' }, { status: 400 });
		}

		const { error } = await locals.supabase.auth.setSession({
			access_token,
			refresh_token
		});

		if (error) {
			console.error('Error setting session:', error);
			return json({ success: false, error: 'Failed to set session' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error in set-session:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};