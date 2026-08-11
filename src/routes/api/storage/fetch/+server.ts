import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';

export const GET: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get('path');

	if (!path) {
		return json({ error: 'path required' }, { status: 400 });
	}

	try {
		// Download file from Supabase Storage
		const { data, error } = await supabase.storage
			.from('ghostpost-references')
			.download(path);

		if (error || !data) {
			return json({ error: 'File not found' }, { status: 404 });
		}

		// Convert blob to base64 for JSON response
		const reader = new FileReader();
		return new Promise((resolve) => {
			reader.onload = () => {
				const base64 = (reader.result as string).split(',')[1];
				resolve(json({ content: `data:${data.type};base64,${base64}` }));
			};
			reader.readAsDataURL(data);
		});
	} catch (error) {
		console.error('Error fetching from storage:', error);
		return json({ error: 'Failed to fetch from storage' }, { status: 500 });
	}
};
