<script lang="ts">
	import HideCard from '$lib/cards/HideCard.svelte';
	import UnhideCard from '$lib/cards/UnhideCard.svelte';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';

	let tabSet: number = 0;
	let hiddenType: 'text' | 'image' = 'text';
</script>

<svelte:head>
	<title>Hidenly - Hide Secrets in Messages</title>
</svelte:head>

<div class="container p-10 space-y-4">
	<div class="card p-8 space-y-6 mb-8">
		<h1 class="h1 text-center">🎭 Hidenly</h1>
		<p class="text-center text-lg">Hide your secrets within your messages</p>

		<div class="flex justify-center gap-4">
			<a href="/compose" class="btn variant-filled-primary">
				<span>✨</span>
				<span>AI Ghostpost Composer</span>
			</a>
			<a href="/decode" class="btn variant-filled-secondary">
				<span>🔍</span>
				<span>Decode Messages</span>
			</a>
		</div>

		<div class="text-center text-sm opacity-75">
			<p>New! Use AI to generate posts and hide secrets with our Ghostpost Composer.</p>
			<p>Or use the classic Hide/Unhide tool below.</p>
		</div>
	</div>

	<TabGroup>
		<Tab bind:group={tabSet} name="hideTab" value={0}>Hide</Tab>
		<Tab bind:group={tabSet} name="unhideTab" value={1}>Unhide</Tab>

		<svelte:fragment slot="panel">
			<span>Hidden Type</span>
			<select class="select" bind:value={hiddenType}>
				<option value="text">Text</option>
				<option value="image">Image</option>
			</select>
			<br /><br />
			{#if tabSet === 0}
				<HideCard {hiddenType} />
			{:else if tabSet === 1}
				<UnhideCard {hiddenType} />
			{/if}
		</svelte:fragment>
	</TabGroup>
</div>
