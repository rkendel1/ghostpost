import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get(name) {
					return event.cookies.get(name);
				},
				set(name, value, options) {
					event.cookies.set(name, value, options);
				},
				remove(name, options) {
					event.cookies.delete(name, options);
				}
			}
		}
	);

	/**
	 * A convenience helper so we can see the currently logged in user in
	 * +page.server.ts and +layout.server.ts without a separate import.
	 * */
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;

	// Public routes that don't require authentication
	const publicRoutes = ['/', '/api'];

	// Check if current path is public
	const isPublicRoute = publicRoutes.some(
		(route) => event.url.pathname === route || event.url.pathname.startsWith('/api/')
	);

	if (!isPublicRoute && !event.locals.session) {
		throw redirect(303, '/login');
	}

	return resolve(event);
};
