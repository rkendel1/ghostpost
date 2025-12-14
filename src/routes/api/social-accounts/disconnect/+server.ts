import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { accountId } = await request.json();

		if (!accountId) {
			return json({ success: false, error: 'Account ID is required' }, { status: 400 });
		}

		// Verify the account belongs to the user and deactivate it
		const { data, error } = await supabase
			.from('social_accounts')
			.update({ is_active: false })
			.eq('id', accountId)
			.eq('user_id', session.user.id)
			.select()
			.single();

		if (error) {
			console.error('Error disconnecting social account:', error);
			return json({ success: false, error: 'Failed to disconnect account' }, { status: 500 });
		}

		if (!data) {
			return json({ success: false, error: 'Account not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Account disconnected successfully' });
	} catch (error) {
		console.error('Error in disconnect POST:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
