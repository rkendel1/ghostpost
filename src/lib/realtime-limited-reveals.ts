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
	let lastUpdate: number = 0;
	const UPDATE_DEBOUNCE = 1000; // Prevent rapid fire updates (max 1/sec)

	try {
		// Subscribe to changes on the limited_secrets table for this post
		channel = supabase
			.channel(`limited-secret:${postId}`, {
				config: {
					broadcast: { ack: true },
					presence: { key: postId }
				}
			})
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'limited_secrets',
					filter: `post_id=eq.${postId}`
				},
				(payload) => {
					// Debounce updates to prevent render thrashing
					const now = Date.now();
					if (now - lastUpdate >= UPDATE_DEBOUNCE) {
						if (payload.new) {
							lastUpdate = now;
							onUpdate(payload.new as LimitedSecret);
						}
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					console.log('✅ Subscribed to limited reveals for post:', postId);
				} else if (status === 'CLOSED') {
					console.log('❌ Subscription closed for post:', postId);
				} else if (status === 'CHANNEL_ERROR') {
					console.error('⚠️  Channel error for post:', postId);
				}
			});
	} catch (error) {
		console.error('Failed to subscribe to limited reveals:', error);
	}

	// Return cleanup function with proper teardown
	return () => {
		try {
			if (channel) {
				channel.unsubscribe();
				supabase.removeChannel(channel);
				console.log('✓ Unsubscribed from limited reveals for post:', postId);
			}
		} catch (error) {
			console.error('Error unsubscribing:', error);
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
	const processedEvents = new Set<number>(); // Track processed reveal numbers

	try {
		channel = supabase
			.channel(`reveal-events:${postId}`, {
				config: {
					broadcast: { ack: true }
				}
			})
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'reveal_events',
					filter: `post_id=eq.${postId}`
				},
				(payload) => {
					// Prevent duplicate processing
					if (payload.new) {
						const event = payload.new as any;
						if (!processedEvents.has(event.reveal_number)) {
							processedEvents.add(event.reveal_number);
							// Only trigger callback once per event
							onReveal(event.reveal_number);
						}
					}
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					console.log('✅ Subscribed to reveal events for post:', postId);
				} else if (status === 'CLOSED') {
					console.log('❌ Reveal events subscription closed for post:', postId);
				}
			});
	} catch (error) {
		console.error('Failed to subscribe to reveal events:', error);
	}

	return () => {
		try {
			if (channel) {
				channel.unsubscribe();
				supabase.removeChannel(channel);
				processedEvents.clear();
				console.log('✓ Unsubscribed from reveal events for post:', postId);
			}
		} catch (error) {
			console.error('Error unsubscribing from reveal events:', error);
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
