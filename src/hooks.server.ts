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
