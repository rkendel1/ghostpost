import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { provider, providerData } = await request.json();

		if (!provider || !providerData) {
			return json({ success: false, error: 'Invalid request data' }, { status: 400 });
		}

		// Extract OAuth data from the provider
		const {
			provider_token: accessToken,
			provider_refresh_token: refreshToken,
			user: providerUser
		} = providerData;

		// Store or update the social account
		const { data, error } = await supabase
			.from('social_accounts')
			.upsert(
				{
					user_id: session.user.id,
					provider: provider,
					provider_user_id: providerUser?.id || providerUser?.sub,
					provider_username: providerUser?.user_name || providerUser?.preferred_username,
					provider_email: providerUser?.email,
					access_token: accessToken,
					refresh_token: refreshToken,
					token_expires_at: providerUser?.expires_at
						? new Date(providerUser.expires_at * 1000).toISOString()
						: null,
					scope: providerUser?.scope ? providerUser.scope.split(' ') : [],
					raw_user_meta_data: providerUser,
					is_active: true,
					last_used_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					onConflict: 'user_id,provider,provider_user_id'
				}
			)
			.select()
			.single();

		if (error) {
			console.error('Error storing social account:', error);
			return json({ success: false, error: 'Failed to store social account' }, { status: 500 });
		}

		return json({ success: true, account: data });
	} catch (error) {
		console.error('Error in OAuth callback:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
