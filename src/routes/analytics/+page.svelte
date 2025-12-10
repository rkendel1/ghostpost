<script lang="ts">
	import { onMount } from 'svelte';
	import { decodeMessage, initWasm } from '$lib/ghostpost';

	let encodedInput = '';
	let postId = '';
	let analytics: any = null;
	let publicStats: any = null;
	let isLoading = false;
	let error = '';
	let showPostAnalytics = false;

	onMount(async () => {
		await initWasm();
		loadPublicStats();
	});

	async function loadPublicStats() {
		try {
			const response = await fetch('/api/analytics/public');
			const data = await response.json();
			if (data.success) {
				publicStats = data.analytics;
			}
		} catch (err) {
			console.error('Failed to load public stats:', err);
		}
	}

	async function extractAndLoadAnalytics() {
		if (!encodedInput.trim()) {
			error = 'Please paste an encoded message';
			return;
		}

		isLoading = true;
		error = '';
		analytics = null;
		showPostAnalytics = false;

		try {
			// Decode the message to extract post ID
			const result = await decodeMessage(encodedInput);

			if (!result.postId) {
				error = 'This message does not have analytics enabled';
				isLoading = false;
				return;
			}

			postId = result.postId;

			// Load analytics for this post
			const response = await fetch(`/api/analytics/post?postId=${encodeURIComponent(postId)}`);
			const data = await response.json();

			if (data.success) {
				analytics = data.analytics;
				showPostAnalytics = true;
				error = '';
			} else {
				error = data.error || 'No analytics found for this post';
			}
		} catch (err) {
			error = 'Failed to load analytics or decode message';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}
</script>

<svelte:head>
	<title>Public Analytics - Ghostpost</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-6xl space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="h1">🌐 Public Analytics</h1>
		<div class="flex gap-2">
			<a href="/dashboard" class="btn variant-ghost-surface">
				<span>📊</span>
				<span>Dashboard</span>
			</a>
			<a href="/compose" class="btn variant-ghost-surface">
				<span>✍️</span>
				<span>Compose</span>
			</a>
		</div>
	</div>

	<!-- Global Stats -->
	{#if publicStats}
		<div class="card p-6 variant-ghost-primary">
			<h2 class="h2 mb-4">🌍 Global Ghostpost Statistics</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="text-center">
					<h3 class="h3">{formatNumber(publicStats.totalDecodes)}</h3>
					<p class="text-sm opacity-75">Total Decodes Worldwide</p>
				</div>
				<div class="text-center">
					<h3 class="h3">{publicStats.topCountries.length}</h3>
					<p class="text-sm opacity-75">Countries Reached</p>
				</div>
				<div class="text-center">
					<h3 class="h3">{Object.keys(publicStats.platforms).length}</h3>
					<p class="text-sm opacity-75">Platforms Used</p>
				</div>
			</div>

			{#if publicStats.topCountries.length > 0}
				<div class="mt-6">
					<h3 class="h4 mb-2">Top Countries</h3>
					<div class="flex flex-wrap gap-2">
						{#each publicStats.topCountries.slice(0, 5) as country}
							<span class="badge variant-filled">{country.country} ({country.count})</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if Object.keys(publicStats.platforms).length > 0}
				<div class="mt-6">
					<h3 class="h4 mb-2">Popular Platforms</h3>
					<div class="flex flex-wrap gap-2">
						{#each Object.entries(publicStats.platforms)
							.sort(([, a], [, b]) => b - a)
							.slice(0, 5) as [platform, count]}
							<span class="badge variant-filled-secondary capitalize">{platform} ({count})</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Check Post Analytics -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">🔍 Check Message Analytics</h2>
		<p class="text-sm opacity-75">
			Paste any encoded message to see its public analytics stats. This is read-only and shows
			aggregate data.
		</p>

		<label class="label">
			<span>Paste Encoded Message</span>
			<textarea
				class="textarea"
				rows="5"
				bind:value={encodedInput}
				placeholder="Paste an encoded message here to view its analytics..."
			/>
		</label>

		<button
			class="btn variant-filled-primary"
			on:click={extractAndLoadAnalytics}
			disabled={isLoading}
		>
			{#if isLoading}
				<span>⏳ Loading...</span>
			{:else}
				<span>📊 View Analytics</span>
			{/if}
		</button>
	</div>

	{#if error}
		<div class="card p-4 variant-ghost-error">
			<p>❌ {error}</p>
		</div>
	{/if}

	{#if showPostAnalytics && analytics}
		<div class="space-y-6">
			<div class="card p-6 variant-ghost-success">
				<h2 class="h2 mb-4">📊 Message Analytics</h2>
				<p class="text-sm opacity-75 mb-4">Post ID: <code>{postId}</code></p>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="text-center">
						<h3 class="h3">{analytics.totalDecodes}</h3>
						<p class="text-sm opacity-75">Total Decodes</p>
					</div>
					<div class="text-center">
						<h3 class="h3">{analytics.uniqueUsers}</h3>
						<p class="text-sm opacity-75">Unique Users</p>
					</div>
				</div>

				{#if Object.keys(analytics.platforms).length > 0}
					<div class="mt-6">
						<h3 class="h4 mb-2">Platforms</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(analytics.platforms)
								.sort(([, a], [, b]) => b - a)
								.slice(0, 5) as [platform, count]}
								<span class="badge variant-filled capitalize">{platform} ({count})</span>
							{/each}
						</div>
					</div>
				{/if}

				{#if Object.keys(analytics.countries).length > 0}
					<div class="mt-6">
						<h3 class="h4 mb-2">Top Countries</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(analytics.countries)
								.sort(([, a], [, b]) => b - a)
								.slice(0, 5) as [country, count]}
								<span class="badge variant-filled-secondary">{country} ({count})</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="card p-6 variant-ghost-surface">
		<h3 class="h3 mb-2">💡 About Public Analytics</h3>
		<div class="space-y-2 text-sm">
			<p>
				The public analytics page allows anyone to paste an encoded Ghostpost message and see
				aggregate statistics about how it's performing.
			</p>
			<p>This creates a viral flywheel where:</p>
			<ul class="list-disc list-inside space-y-1 ml-4">
				<li>Creators can share analytics screenshots to prove engagement</li>
				<li>Recipients get curious and check message stats</li>
				<li>Everyone discovers the Ghostpost platform organically</li>
			</ul>
			<p class="opacity-75 mt-4">
				All data is aggregated and anonymous. Individual user information is never exposed.
			</p>
		</div>
	</div>

	<div class="card p-6">
		<h3 class="h3 mb-4">🚀 Create Your Own</h3>
		<p class="text-sm mb-4">
			Want to create your own tracked secret messages? Head to the compose page to get started!
		</p>
		<a href="/compose" class="btn variant-filled">✍️ Start Composing</a>
	</div>
</div>
