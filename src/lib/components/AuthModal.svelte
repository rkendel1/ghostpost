<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { modalStore } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let isSignUp = false;
	let error = '';
	let loading = false;
	let socialLoading = '';

	async function handleSubmit() {
		error = '';
		loading = true;

		if (isSignUp && password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			loading = false;
			return;
		}

		try {
			if (isSignUp) {
				const { data, error: authError } = await authStore.signUp(email, password);
				if (authError) {
					error = authError.message;
				} else {
					modalStore.close();
					error = 'Account created! Please check your email to verify your account.';
					// Note: In production, use a proper toast notification system
				}
			} else {
				const { data, error: authError } = await authStore.signIn(email, password);
				if (authError) {
					error = authError.message;
				} else {
					// Redirect to dashboard after successful sign-in
					await goto('/dashboard');
					modalStore.close();
				}
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function handleSocialLogin(provider: 'google' | 'github' | 'discord' | 'twitter') {
		error = '';
		socialLoading = provider;

		try {
			const { data, error: authError } = await authStore.signInWithProvider(provider);
			if (authError) {
				error = authError.message;
				socialLoading = '';
			}
			// Note: The redirect happens automatically via OAuth flow
		} catch (err) {
			error = 'An unexpected error occurred with social login';
			console.error(err);
			socialLoading = '';
		}
	}

	function toggleMode() {
		isSignUp = !isSignUp;
		error = '';
		confirmPassword = '';
	}
</script>

<div class="card p-6 space-y-4 max-w-md">
	<h2 class="h2 text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

	<!-- Social Login Buttons -->
	<div class="space-y-2">
		<p class="text-center text-sm opacity-75">Continue with:</p>
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={() => handleSocialLogin('google')}
				disabled={loading || !!socialLoading}
			>
				{#if socialLoading === 'google'}
					<span>⏳</span>
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="currentColor"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="currentColor"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="currentColor"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					<span>Google</span>
				{/if}
			</button>
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={() => handleSocialLogin('github')}
				disabled={loading || !!socialLoading}
			>
				{#if socialLoading === 'github'}
					<span>⏳</span>
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"
						/>
					</svg>
					<span>GitHub</span>
				{/if}
			</button>
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={() => handleSocialLogin('discord')}
				disabled={loading || !!socialLoading}
			>
				{#if socialLoading === 'discord'}
					<span>⏳</span>
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
						/>
					</svg>
					<span>Discord</span>
				{/if}
			</button>
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={() => handleSocialLogin('twitter')}
				disabled={loading || !!socialLoading}
			>
				{#if socialLoading === 'twitter'}
					<span>⏳</span>
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M18.244 2.25h3.308l-7.227 8.26l8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
						/>
					</svg>
					<span>X</span>
				{/if}
			</button>
		</div>
	</div>

	<div class="flex items-center gap-4">
		<hr class="flex-1" />
		<span class="text-sm opacity-75">or</span>
		<hr class="flex-1" />
	</div>

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<label class="label">
			<span>Email</span>
			<input
				type="email"
				class="input"
				bind:value={email}
				placeholder="your@email.com"
				required
				disabled={loading || !!socialLoading}
			/>
		</label>

		<label class="label">
			<span>Password</span>
			<input
				type="password"
				class="input"
				bind:value={password}
				placeholder="••••••••"
				required
				minlength="6"
				disabled={loading || !!socialLoading}
			/>
		</label>

		{#if isSignUp}
			<label class="label">
				<span>Confirm Password</span>
				<input
					type="password"
					class="input"
					bind:value={confirmPassword}
					placeholder="••••••••"
					required
					minlength="6"
					disabled={loading || !!socialLoading}
				/>
			</label>
		{/if}

		{#if error}
			<div class="card p-3 variant-ghost-error">
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		<button
			type="submit"
			class="btn variant-filled-primary w-full"
			disabled={loading || !!socialLoading}
		>
			{#if loading}
				<span>⏳ Processing...</span>
			{:else}
				<span>{isSignUp ? '🚀 Create Account' : '🔐 Sign In'}</span>
			{/if}
		</button>
	</form>

	<div class="text-center">
		<button
			class="btn btn-sm variant-ghost"
			on:click={toggleMode}
			disabled={loading || !!socialLoading}
		>
			{isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
		</button>
	</div>
</div>
