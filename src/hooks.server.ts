import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Public routes that don't require authentication
	const publicRoutes = ['/', '/api'];

	// Check if current path is public
	const isPublicRoute = publicRoutes.some((route) => event.url.pathname === route || event.url.pathname.startsWith('/api/'));

	// If not a public route, check for auth (we'll do this client-side for simplicity)
	// For now, just pass through and handle in page components

	return resolve(event);
};
