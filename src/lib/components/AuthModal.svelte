<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { modalStore } from '@skeletonlabs/skeleton';

	let email = '';
	let password = '';
	let confirmPassword = '';
	let isSignUp = false;
	let error = '';
	let loading = false;

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

	function toggleMode() {
		isSignUp = !isSignUp;
		error = '';
		confirmPassword = '';
	}
</script>

<div class="card p-6 space-y-4 max-w-md">
	<h2 class="h2 text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h2>

	<form on:submit|preventDefault={handleSubmit} class="space-y-4">
		<label class="label">
			<span>Email</span>
			<input
				type="email"
				class="input"
				bind:value={email}
				placeholder="your@email.com"
				required
				disabled={loading}
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
				disabled={loading}
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
					disabled={loading}
				/>
			</label>
		{/if}

		{#if error}
			<div class="card p-3 variant-ghost-error">
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		<button type="submit" class="btn variant-filled-primary w-full" disabled={loading}>
			{#if loading}
				<span>⏳ Processing...</span>
			{:else}
				<span>{isSignUp ? '🚀 Create Account' : '🔐 Sign In'}</span>
			{/if}
		</button>
	</form>

	<div class="text-center">
		<button class="btn btn-sm variant-ghost" on:click={toggleMode} disabled={loading}>
			{isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
		</button>
	</div>
</div>
