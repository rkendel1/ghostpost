import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { InstallTrackingRequest } from '$lib/types/tracking';

/**
 * POST /api/tracking/install
 * Track a userscript installation or update existing one
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as InstallTrackingRequest;
		const { install_fingerprint, device_info, user_id } = body;

		if (!install_fingerprint || !device_info) {
			return json(
				{
					success: false,
					error: 'install_fingerprint and device_info are required'
				},
				{ status: 400 }
			);
		}

		// Check if this install already exists
		const { data: existingInstall } = await supabase
			.from('userscript_installs')
			.select('id')
			.eq('install_fingerprint', install_fingerprint)
			.single();

		if (existingInstall) {
			// Update existing install with last_seen timestamp
			const { error: updateError } = await supabase
				.from('userscript_installs')
				.update({
					last_seen: new Date().toISOString(),
					user_id: user_id || null,
					version: device_info.version || null
				})
				.eq('install_fingerprint', install_fingerprint);

			if (updateError) {
				console.error('Error updating userscript install:', updateError);
				return json(
					{
						success: false,
						error: 'Failed to update install'
					},
					{ status: 500 }
				);
			}

			return json({
				success: true,
				message: 'Install updated successfully',
				is_new: false
			});
		}

		// Insert new install
		const { error: insertError } = await supabase.from('userscript_installs').insert({
			install_fingerprint,
			user_id: user_id || null,
			user_agent: device_info.userAgent || null,
			platform: device_info.platform || null,
			browser: device_info.browser || null,
			os: device_info.os || null,
			version: device_info.version || null,
			installed_at: new Date().toISOString(),
			last_seen: new Date().toISOString()
		});

		if (insertError) {
			console.error('Error inserting userscript install:', insertError);
			return json(
				{
					success: false,
					error: 'Failed to track install'
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			message: 'Install tracked successfully',
			is_new: true
		});
	} catch (error) {
		console.error('Error tracking userscript install:', error);
		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
