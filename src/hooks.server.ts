import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get(name) {
				return event.cookies.get(name);
			},
			set(name, value, options) {
				event.cookies.set(name, value, { ...options, path: '/' });
			},
			remove(name, options) {
				event.cookies.delete(name, { ...options, path: '/' });
			}
		}
	});

	/**
	 * A convenience helper so we can see the currently logged in user in
	 * +page.server.ts and +layout.server.ts without a separate import.
	 * */
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;

	// Handle OAuth callbacks - store provider tokens in social_accounts table
	// TODO: For production, consider implementing a session-based cache to avoid
	// repeated database queries. The current implementation checks on every request.
	if (session && session.user && session.user.app_metadata?.provider) {
		const provider = session.user.app_metadata.provider;
		// Only process OAuth providers (not email)
		if (provider !== 'email') {
			try {
				// Check if we need to store this social account
				// Note: This runs on every request with an OAuth session.
				// For production, consider caching this check or using a flag
				// to avoid unnecessary database queries
				const { data: existingAccount } = await event.locals.supabase
					.from('social_accounts')
					.select('id')
					.eq('user_id', session.user.id)
					.eq('provider', provider)
					.eq('provider_user_id', session.user.user_metadata?.sub || session.user.id)
					.single();

				// Only insert if account doesn't exist
				if (!existingAccount) {
					await event.locals.supabase.from('social_accounts').insert({
						user_id: session.user.id,
						provider: provider,
						provider_user_id: session.user.user_metadata?.sub || session.user.id,
						provider_username:
							session.user.user_metadata?.user_name ||
							session.user.user_metadata?.preferred_username ||
							session.user.user_metadata?.name,
						provider_email: session.user.email,
						access_token: session.provider_token || null,
						refresh_token: session.provider_refresh_token || null,
						scope: session.user.user_metadata?.scope
							? session.user.user_metadata.scope.split(' ')
							: [],
						raw_user_meta_data: session.user.user_metadata,
						is_active: true,
						last_used_at: new Date().toISOString()
					});
				}
			} catch (error) {
				console.error('Error storing OAuth tokens:', error);
			}
		}
	}

	// Public routes that don't require authentication
	// These routes are accessible without login
	const publicRoutes = [
		'/', // Home page
		'/demo', // Demo page
		'/decode', // Decode page (users can decode without auth)
		'/share', // Share/mobile page
		'/install', // Install redirect page
		'/install-easy', // Easy install page
		'/install-wizard', // Install wizard page
		'/analytics' // Analytics page (can view without auth, but needs postId in URL)
	];

	// Check if current path is public
	const isPublicRoute = publicRoutes.some(
		(route) => event.url.pathname === route || event.url.pathname.startsWith('/api/')
	);

	// Don't redirect to login for public routes
	// For non-public routes, the page component will handle auth with AuthGuard modal
	// No server-side redirect needed as we use client-side modal auth

	return resolve(event);
};

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

interface Locals {
	supabase: SupabaseClient;
	session: Session | null;
}

export type { Locals };
