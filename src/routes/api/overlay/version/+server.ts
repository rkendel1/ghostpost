import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Cache-Control': 'public, max-age=300, s-maxage=300'
};

export const GET: RequestHandler = async () =>
	json(
		{
			version: '2.6.1',
			installUrl:
				'https://www.tampermonkey.net/script_installation.php#url=https://ghostpost-six.vercel.app/ghostpost-reveal.user.js',
			releasedAt: '2026-08-12T00:00:00.000Z'
		},
		{ headers }
	);
