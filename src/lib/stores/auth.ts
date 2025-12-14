import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthState {
	user: User | null;
	session: Session | null;
	loading: boolean;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		session: null,
		loading: true
	});

	return {
		subscribe,
		initialize: async () => {
			// Get initial session
			const {
				data: { session }
			} = await supabase.auth.getSession();

			set({
				user: session?.user ?? null,
				session: session ?? null,
				loading: false
			});

			// Listen for auth changes
			supabase.auth.onAuthStateChange((_event, session) => {
				set({
					user: session?.user ?? null,
					session: session ?? null,
					loading: false
				});
			});
		},
		signIn: async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (!error && data.session) {
				try {
					await fetch('/api/auth/set-session', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						credentials: 'include',
						body: JSON.stringify({
							access_token: data.session.access_token,
							refresh_token: data.session.refresh_token
						})
					});
				} catch (syncError) {
					console.error('Failed to sync session to server:', syncError);
				}
			}

			return { data, error };
		},
		signUp: async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password
			});

			if (!error && data.session) {
				try {
					await fetch('/api/auth/set-session', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						credentials: 'include',
						body: JSON.stringify({
							access_token: data.session.access_token,
							refresh_token: data.session.refresh_token
						})
					});
				} catch (syncError) {
					console.error('Failed to sync session to server:', syncError);
				}
			}

			return { data, error };
		},
		signInWithProvider: async (
			provider: 'google' | 'github' | 'facebook' | 'discord' | 'twitter'
		) => {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/dashboard`,
					scopes: getProviderScopes(provider)
				}
			});

			return { data, error };
		},
		signOut: async () => {
			const { error } = await supabase.auth.signOut();
			return { error };
		},
		resetPassword: async (email: string) => {
			const { data, error } = await supabase.auth.resetPasswordForEmail(email);
			return { data, error };
		}
	};
}

// Helper function to get appropriate scopes for each provider
function getProviderScopes(
	provider: 'google' | 'github' | 'facebook' | 'discord' | 'twitter'
): string {
	const scopes = {
		google: 'openid email profile',
		github: 'user:email read:user',
		facebook: 'email public_profile',
		discord: 'identify email',
		// Note: offline.access provides refresh tokens for long-lived access
		// This is needed for future automated posting features
		// Remove if only basic authentication is needed
		twitter: 'tweet.read users.read offline.access'
	};
	return scopes[provider] || '';
}

export const authStore = createAuthStore();
