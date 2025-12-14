<script lang="ts">
	import { drawerStore } from '@skeletonlabs/skeleton';
	import { base } from '$app/paths';
	import { authStore } from '$lib/stores/auth';

	function drawerClose(): void {
		drawerStore.close();
	}

	// Public pages accessible to everyone
	const publicMenus = [
		{ href: '/', label: '🏠 Home' },
		{ href: '/decode', label: '🔍 Decode' },
		{ href: '/analytics', label: '🌐 Analytics' }
	];

	// Pages that require authentication
	const authMenus = [
		{ href: '/compose', label: '✍️ Compose' },
		{ href: '/dashboard', label: '📊 My Posts' },
		{ href: '/settings', label: '⚙️ Settings' }
	];

	$: user = $authStore.user;
	$: menus = user ? [...publicMenus, ...authMenus] : publicMenus;
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
