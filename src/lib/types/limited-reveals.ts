/**
 * Types for Limited Reveals / FOMO Feature
 */

export interface LimitedSecret {
	id: string;
	post_id: string;
	user_id: string;
	max_reveals: number | null; // null = unlimited
	current_reveals: number;
	is_expired: boolean;
	created_at: string;
	updated_at: string;
}

export interface RevealEvent {
	id: string;
	post_id: string;
	reveal_number: number;
	timestamp: string;
	user_fingerprint: string | null;
	created_at: string;
}

export interface RevealStatus {
	post_id: string;
	max_reveals: number | null;
	current_reveals: number;
	is_expired: boolean;
	remaining_reveals: number | null; // null if unlimited
	percentage_revealed: number | null; // null if unlimited
	can_reveal: boolean;
}

export interface RevealResult {
	success: boolean;
	reveal_number?: number;
	total_reveals?: number;
	remaining?: number;
	message?: string;
	secret_content?: string;
}
