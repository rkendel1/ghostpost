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

		// Fetch the social account
		const { data: account, error: fetchError } = await supabase
			.from('social_accounts')
			.select('*')
			.eq('id', accountId)
			.eq('user_id', session.user.id)
			.single();

		if (fetchError || !account) {
			return json({ success: false, error: 'Account not found' }, { status: 404 });
		}

		// Note: Token refresh logic would go here
		// This is provider-specific and would require implementing OAuth refresh flows
		// For now, we'll mark that a refresh attempt was made
		const { error: updateError } = await supabase
			.from('social_accounts')
			.update({
				updated_at: new Date().toISOString()
			})
			.eq('id', accountId)
			.eq('user_id', session.user.id);

		if (updateError) {
			console.error('Error updating social account:', updateError);
			return json({ success: false, error: 'Failed to refresh token' }, { status: 500 });
		}

		return json({
			success: true,
			message: 'Token refresh initiated. Please reconnect the account to get a new token.'
		});
	} catch (error) {
		console.error('Error in refresh POST:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
