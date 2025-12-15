<script lang="ts">
	import '@skeletonlabs/skeleton/themes/theme-hamlindigo.css';
	import '@skeletonlabs/skeleton/styles/skeleton.css';
	import '../app.postcss';
	import './styles.css';

	import { onMount } from 'svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	import { AppBar, AppShell } from '@skeletonlabs/skeleton';
	import { Drawer, drawerStore, Modal, modalStore } from '@skeletonlabs/skeleton';
	import type { ModalSettings } from '@skeletonlabs/skeleton';

	import Navigation from '$lib/navigation/Navigation.svelte';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	injectAnalytics();

	let mounted = false;

	onMount(async () => {
		await authStore.initialize();
		mounted = true;
	});

	function drawerOpen(): void {
		drawerStore.open({});
	}

	function openAuthModal(): void {
		const modal: ModalSettings = {
			type: 'component',
			component: { ref: AuthModal }
		};
		modalStore.trigger(modal);
	}

	async function handleSignOut(): Promise<void> {
		await authStore.signOut();
		await goto('/');
	}

	$: user = $authStore.user;
</script>

<Drawer>
	<h2 class="p-4">Navigation</h2>
	<hr />
	<Navigation />
</Drawer>

<Modal />

<AppShell slotSidebarLeft="bg-surface-500/5 w-0">
	<svelte:fragment slot="header">
		<AppBar>
			<svelte:fragment slot="lead">
				<div class="flex items-center">
					<button class="lg:hidden btn btn-sm mr-4" on:click={drawerOpen}>
						<span>
							<svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
								<rect width="100" height="20" />
								<rect y="30" width="100" height="20" />
								<rect y="60" width="100" height="20" />
							</svg>
						</span>
					</button>
					<a href="/" class="no-underline hover:no-underline text-inherit flex items-center gap-2">
						<span class="text-2xl">👻</span>
						<strong class="text-xl uppercase"> GhostPost </strong>
					</a>
				</div>
			</svelte:fragment>
			<svelte:fragment slot="trail">
				<div class="flex items-center gap-4">
					{#if mounted && user}
						<span class="text-sm opacity-75 hidden md:inline">
							{user.email}
						</span>
						<button class="btn btn-sm variant-ghost-surface" on:click={handleSignOut}>
							Sign Out
						</button>
					{:else if mounted}
						<button class="btn btn-sm variant-filled-primary" on:click={openAuthModal}>
							Sign In
						</button>
					{/if}
				</div>
			</svelte:fragment>
		</AppBar>
	</svelte:fragment>

	<svelte:fragment slot="sidebarLeft">
		<Navigation />
	</svelte:fragment>
	<main>
		<slot />
	</main>
</AppShell>

<style>
</style>
