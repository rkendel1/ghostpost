import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export type Database = {
	public: {
		Tables: {
			posts: {
				Row: {
					id: string;
					user_id: string;
					post_id: string;
					content: string;
					platform: string;
					visible_message: string;
					secret_message: string;
					secret_type: 'text' | 'image';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					post_id: string;
					content: string;
					platform: string;
					visible_message: string;
					secret_message: string;
					secret_type: 'text' | 'image';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					post_id?: string;
					content?: string;
					platform?: string;
					visible_message?: string;
					secret_message?: string;
					secret_type?: 'text' | 'image';
					created_at?: string;
					updated_at?: string;
				};
			};
			limited_secrets: {
				Row: {
					id: string;
					post_id: string;
					user_id: string;
					max_reveals: number | null;
					current_reveals: number;
					is_expired: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					post_id: string;
					user_id: string;
					max_reveals?: number | null;
					current_reveals?: number;
					is_expired?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					post_id?: string;
					user_id?: string;
					max_reveals?: number | null;
					current_reveals?: number;
					is_expired?: boolean;
					created_at?: string;
					updated_at?: string;
				};
			};
			reveal_events: {
				Row: {
					id: string;
					post_id: string;
					reveal_number: number;
					timestamp: string;
					user_fingerprint: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					post_id: string;
					reveal_number: number;
					timestamp?: string;
					user_fingerprint?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					post_id?: string;
					reveal_number?: number;
					timestamp?: string;
					user_fingerprint?: string | null;
					created_at?: string;
				};
			};
		};
	};
};
