/**
 * Types for userscript install tracking and encoded message tracking
 */

export interface UserscriptInstall {
	id?: string;
	user_id?: string | null;
	install_fingerprint: string;
	user_agent?: string | null;
	platform?: string | null;
	browser?: string | null;
	os?: string | null;
	installed_at?: string;
	last_seen?: string;
	version?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface EncodedMessageTracking {
	id?: string;
	user_id: string;
	post_id: string;
	platform: string;
	secret_type: 'text' | 'image';
	visible_length: number;
	hidden_length: number;
	total_length: number;
	has_limited_reveals?: boolean;
	max_reveals?: number | null;
	created_at?: string;
}

export interface DeviceInfo {
	userAgent: string;
	platform: string;
	browser: string;
	os: string;
	version?: string;
}

export interface InstallTrackingRequest {
	install_fingerprint: string;
	device_info: DeviceInfo;
	user_id?: string;
}

export interface InstallHeartbeatRequest {
	install_fingerprint: string;
	version?: string;
}
