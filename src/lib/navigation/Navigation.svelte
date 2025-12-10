<script lang="ts">
	import { drawerStore } from '@skeletonlabs/skeleton';
	import { base } from '$app/paths';

	function drawerClose(): void {
		drawerStore.close();
	}

	let menus = [
		{ href: '/', label: '🏠 Home' },
		{ href: '/compose', label: '✍️ Compose' },
		{ href: '/decode', label: '🔍 Decode' },
		{ href: '/dashboard', label: '📊 My Posts' },
		{ href: '/analytics', label: '🌐 Analytics' }
	];
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
