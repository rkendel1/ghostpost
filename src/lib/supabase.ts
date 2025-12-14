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
					social_account_id: string | null;
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
					social_account_id?: string | null;
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
					social_account_id?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			social_accounts: {
				Row: {
					id: string;
					user_id: string;
					provider: string;
					provider_user_id: string;
					provider_username: string | null;
					provider_email: string | null;
					access_token: string | null;
					refresh_token: string | null;
					token_expires_at: string | null;
					scope: string[] | null;
					raw_user_meta_data: any;
					is_active: boolean;
					last_used_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					provider: string;
					provider_user_id: string;
					provider_username?: string | null;
					provider_email?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					scope?: string[] | null;
					raw_user_meta_data?: any;
					is_active?: boolean;
					last_used_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					provider?: string;
					provider_user_id?: string;
					provider_username?: string | null;
					provider_email?: string | null;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					scope?: string[] | null;
					raw_user_meta_data?: any;
					is_active?: boolean;
					last_used_at?: string | null;
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
			userscript_installs: {
				Row: {
					id: string;
					user_id: string | null;
					install_fingerprint: string;
					user_agent: string | null;
					platform: string | null;
					browser: string | null;
					os: string | null;
					installed_at: string;
					last_seen: string;
					version: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
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
				};
				Update: {
					id?: string;
					user_id?: string | null;
					install_fingerprint?: string;
					user_agent?: string | null;
					platform?: string | null;
					browser?: string | null;
					os?: string | null;
					installed_at?: string;
					last_seen?: string;
					version?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			encoded_messages_tracking: {
				Row: {
					id: string;
					user_id: string;
					post_id: string;
					platform: string;
					secret_type: string;
					visible_length: number;
					hidden_length: number;
					total_length: number;
					has_limited_reveals: boolean;
					max_reveals: number | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					post_id: string;
					platform: string;
					secret_type: string;
					visible_length: number;
					hidden_length: number;
					total_length: number;
					has_limited_reveals?: boolean;
					max_reveals?: number | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					post_id?: string;
					platform?: string;
					secret_type?: string;
					visible_length?: number;
					hidden_length?: number;
					total_length?: number;
					has_limited_reveals?: boolean;
					max_reveals?: number | null;
					created_at?: string;
				};
			};
		};
	};
};
