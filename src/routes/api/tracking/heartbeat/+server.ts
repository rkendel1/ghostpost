import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/supabase';
import type { InstallHeartbeatRequest } from '$lib/types/tracking';

/**
 * POST /api/tracking/heartbeat
 * Update last_seen timestamp for existing install
 */
export const POST: RequestHandler = async ({ request }) => {
try {
const body = (await request.json()) as InstallHeartbeatRequest;
const { install_fingerprint, version } = body;

if (!install_fingerprint) {
return json(
{
success: false,
error: 'install_fingerprint is required'
},
{ status: 400 }
);
}

// Update last_seen timestamp
const { error: updateError } = await supabase
.from('userscript_installs')
.update({
last_seen: new Date().toISOString(),
...(version && { version })
})
.eq('install_fingerprint', install_fingerprint);

if (updateError) {
console.error('Error updating heartbeat:', updateError);
return json(
{
success: false,
error: 'Failed to update heartbeat'
},
{ status: 500 }
);
}

return json({
success: true,
message: 'Heartbeat updated successfully'
});
} catch (error) {
console.error('Error updating heartbeat:', error);
return json(
{
success: false,
error: 'Internal server error'
},
{ status: 500 }
);
}
};
