import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Fetch user's connected social accounts
		const { data: accounts, error } = await supabase
			.from('social_accounts')
			.select('id, provider, provider_username, provider_email, is_active, last_used_at, created_at, token_expires_at')
			.eq('user_id', session.user.id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching social accounts:', error);
			return json({ success: false, error: 'Failed to fetch social accounts' }, { status: 500 });
		}

		return json({ success: true, accounts: accounts || [] });
	} catch (error) {
		console.error('Error in social accounts GET:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
