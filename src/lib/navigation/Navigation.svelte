<script lang="ts">
	import { drawerStore } from '@skeletonlabs/skeleton';
	import { base } from '$app/paths';
	import { authStore } from '$lib/stores/auth';

	function drawerClose(): void {
		drawerStore.close();
	}

	// Navigation for unauthenticated users
	const unauthMenus = [
		{ href: '/', label: '🏠 Home' },
		{ href: '/decode', label: '🔍 Decode' },
		{ href: '/analytics', label: '🌐 Analytics' }
	];

	// Navigation for authenticated users (Dashboard is their home)
	const authMenus = [
		{ href: '/dashboard', label: '🏠 Dashboard' },
		{ href: '/compose', label: '✍️ Compose' },
		{ href: '/decode', label: '🔍 Decode' },
		{ href: '/analytics', label: '🌐 Analytics' },
		{ href: '/settings', label: '⚙️ Settings' }
	];

	$: user = $authStore.user;
	$: menus = user ? authMenus : unauthMenus;
</script>

<nav class="list-nav p-4">
	<ul>
		{#each menus as menu}
			<li class="list-nav-item">
				<a href="{base}{menu.href}" on:click={drawerClose}>{menu.label}</a>
			</li>
		{/each}
	</ul>
</nav>
