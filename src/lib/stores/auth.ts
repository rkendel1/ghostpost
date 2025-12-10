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
			return { data, error };
		},
		signUp: async (email: string, password: string) => {
			const { data, error } = await supabase.auth.signUp({
				email,
				password
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

export const authStore = createAuthStore();
