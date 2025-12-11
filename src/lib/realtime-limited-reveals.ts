/**
 * Supabase Realtime utilities for Limited Reveals feature
 * Enables real-time updates of reveal counts across all viewers
 */

import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { LimitedSecret } from './types/limited-reveals';

/**
 * Subscribe to real-time updates for a specific post's limited secret
 * @param postId - The post ID to subscribe to
 * @param onUpdate - Callback function called when the reveal count updates
 * @returns Cleanup function to unsubscribe
 */
export function subscribeLimitedSecret(
	postId: string,
	onUpdate: (secret: LimitedSecret) => void
): () => void {
	let channel: RealtimeChannel | null = null;

	// Subscribe to changes on the limited_secrets table for this post
	channel = supabase
		.channel(`limited-secret:${postId}`)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'limited_secrets',
				filter: `post_id=eq.${postId}`
			},
			(payload) => {
				if (payload.new) {
					onUpdate(payload.new as LimitedSecret);
				}
			}
		)
		.subscribe();

	// Return cleanup function
	return () => {
		if (channel) {
			supabase.removeChannel(channel);
		}
	};
}

/**
 * Subscribe to all reveal events for a specific post
 * @param postId - The post ID to subscribe to
 * @param onReveal - Callback function called when a new reveal occurs
 * @returns Cleanup function to unsubscribe
 */
export function subscribeRevealEvents(
	postId: string,
	onReveal: (revealNumber: number) => void
): () => void {
	let channel: RealtimeChannel | null = null;

	channel = supabase
		.channel(`reveal-events:${postId}`)
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'reveal_events',
				filter: `post_id=eq.${postId}`
			},
			(payload) => {
				if (payload.new) {
					const event = payload.new as any;
					onReveal(event.reveal_number);
				}
			}
		)
		.subscribe();

	return () => {
		if (channel) {
			supabase.removeChannel(channel);
		}
	};
}

/**
 * Broadcast a reveal event to all subscribers
 * This is useful for optimistic UI updates
 */
export async function broadcastRevealEvent(postId: string, revealNumber: number): Promise<void> {
	const channel = supabase.channel(`reveal-broadcast:${postId}`);
	
	await channel.send({
		type: 'broadcast',
		event: 'reveal',
		payload: { postId, revealNumber }
	});
}
