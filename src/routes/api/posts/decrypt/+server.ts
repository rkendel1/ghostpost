import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import { decryptSecret, deriveUserKey, getMasterSecret } from '$lib/encryption';

/**
 * GET /api/posts/decrypt?post_id=xxx
 * Decrypts and returns the secret message for a specific post
 * Only the post owner can decrypt their secrets
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Get user from session
		const session = locals.session;
		const user = session?.user;

		if (!user) {
			return json(
				{
					success: false,
					error: 'Unauthorized'
				},
				{ status: 401 }
			);
		}

		const postId = url.searchParams.get('post_id');

		if (!postId) {
			return json(
				{
					success: false,
					error: 'post_id parameter is required'
				},
				{ status: 400 }
			);
		}

		// Get the post from database
		const { data: post, error } = await supabase
			.from('posts')
			.select('user_id, secret_message, secret_type, secret_encrypted')
			.eq('post_id', postId)
			.single();

		if (error || !post) {
			return json(
				{
					success: false,
					error: 'Post not found'
				},
				{ status: 404 }
			);
		}

		// Verify the user owns this post
		if (post.user_id !== user.id) {
			return json(
				{
					success: false,
					error: 'Unauthorized - you can only decrypt your own posts'
				},
				{ status: 403 }
			);
		}

		// Decrypt the secret if it's encrypted
		let secretMessage = post.secret_message;
		if (post.secret_encrypted) {
			try {
				const masterSecret = getMasterSecret();
				const userKey = deriveUserKey(user.id, masterSecret);
				secretMessage = decryptSecret(post.secret_message, userKey);
			} catch (decryptError) {
				// Log generic error without revealing post details
				console.error('Decryption operation failed');
				return json(
					{
						success: false,
						error: 'Failed to decrypt secret'
					},
					{ status: 500 }
				);
			}
		}

		return json({
			success: true,
			secret_message: secretMessage,
			secret_type: post.secret_type,
			is_encrypted: post.secret_encrypted
		});
	} catch (error) {
		console.error('Error decrypting post:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to decrypt post'
			},
			{ status: 500 }
		);
	}
};
