import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { trackDecodeEvent, detectPlatform, generateAnonymousUserId } from '$lib/analytics';
import type { DecodeEvent } from '$lib/types/analytics';

/**
 * POST /api/analytics/track
 * Track a decode event when someone decodes a hidden message
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { postId } = await request.json();

		if (!postId) {
			return json(
				{
					success: false,
					error: 'postId is required'
				},
				{ status: 400 }
			);
		}

		// Extract metadata from request
		const referrer = request.headers.get('referer') || undefined;
		const userAgent = request.headers.get('user-agent') || undefined;

		// Get geo data from Vercel headers
		const country = request.headers.get('x-vercel-ip-country') || undefined;

		// Detect platform from referrer and user-agent
		const platform = detectPlatform(referrer, userAgent);

		// Generate anonymous user ID
		const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
		const anonymousUserId = generateAnonymousUserId(userAgent, ipAddress || undefined);

		// Create decode event
		const event: DecodeEvent = {
			postId,
			timestamp: Date.now(),
			referrer,
			userAgent,
			country,
			platform,
			anonymousUserId
		};

		// Track the event
		await trackDecodeEvent(event);

		return json({
			success: true,
			message: 'Event tracked successfully'
		});
	} catch (error) {
		console.error('Error tracking decode event:', error);

		// Don't fail the decode if analytics fails
		return json({
			success: false,
			error: 'Analytics tracking failed',
			message: 'Decode successful but analytics unavailable'
		});
	}
};
