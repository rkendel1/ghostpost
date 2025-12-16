import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerClient } from '@supabase/ssr';

// CORS headers for cross-origin requests from extension
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

// Handle OPTIONS preflight
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: corsHeaders
	});
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { post_id, user_fingerprint } = await request.json();

		if (!post_id) {
			return json(
				{ success: false, error: 'Missing post_id' },
				{ status: 400, headers: corsHeaders }
			);
		}

		// Create Supabase client (no auth required for anonymous tracking)
		const supabase = createServerClient(
			process.env.SUPABASE_URL!,
			process.env.SUPABASE_ANON_KEY!,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				},
				cookies: {
					get(name) {
						return null; // No session
					},
					set(name, value, options) {
						// No-op
					},
					remove(name, options) {
						// No-op
					}
				}
			}
		);

		// Insert decode event (post_id as UUID)
		const { error: insertError } = await supabase
			.from('decode_events')
			.insert({
				post_id: post_id, // Cast handled by DB (TEXT input to UUID column)
				user_fingerprint: user_fingerprint || null
			});

		if (insertError) {
			console.error('Decode event insert error:', insertError);
			return json(
				{ success: false, message: 'Failed to track decode' },
				{ status: 500, headers: corsHeaders }
			);
		}

		// Get decode count using RPC function
		const { data: countData, error: countError } = await supabase.rpc('get_decode_count', {
			p_post_id: post_id
		});

		let decode_count = 0;
		if (countError) {
			console.error('Decode count error:', countError);
		} else {
			decode_count = countData || 0;
		}

		return json(
			{
				success: true,
				decode_count,
				message: `Decode tracked successfully (attempt #${decode_count})`
			},
			{ headers: corsHeaders }
		);
	} catch (error) {
		console.error('Error tracking decode:', error);
		return json(
			{ success: false, message: 'Internal server error' },
			{ status: 500, headers: corsHeaders }
		);
	}
};