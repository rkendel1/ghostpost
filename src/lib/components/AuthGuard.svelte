<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { modalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';
	import AuthModal from './AuthModal.svelte';

	let checking = true;

	onMount(() => {
		// Wait for auth to initialize
		const unsubscribe = authStore.subscribe((state) => {
			if (!state.loading) {
				checking = false;
				if (!state.user) {
					// Show auth modal
					const modal: ModalSettings = {
						type: 'component',
						component: { ref: AuthModal }
					};
					modalStore.trigger(modal);
				}
			}
		});

		return unsubscribe;
	});

	$: user = $authStore.user;
	$: loading = $authStore.loading;
</script>

{#if loading || checking}
	<div class="container mx-auto p-8 text-center">
		<div class="space-y-4">
			<div class="flex justify-center">
				<div class="w-16 h-16 animate-spin text-6xl">⏳</div>
			</div>
			<p class="text-lg opacity-75">Loading...</p>
		</div>
	</div>
{:else if !user}
	<div class="container mx-auto p-8 max-w-2xl">
		<div class="card p-8 space-y-6 text-center">
			<div class="text-6xl">🔒</div>
			<h2 class="h2">Authentication Required</h2>
			<p class="text-lg opacity-75">
				Please sign in to access this page. GhostPost requires an account to use the full
				application.
			</p>
			<div class="space-y-2">
				<p class="text-sm opacity-75">
					Don't have an account? You can create one by clicking "Sign In" above.
				</p>
			</div>
			<a href="/" class="btn variant-filled-primary">
				<span>🏠</span>
				<span>Back to Home</span>
			</a>
		</div>
	</div>
{:else}
	<slot />
{/if}
