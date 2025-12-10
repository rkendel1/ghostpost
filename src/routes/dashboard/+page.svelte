<script lang="ts">
	import { onMount } from 'svelte';
	import type { DashboardStats } from '$lib/types/analytics';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { authStore } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';

	let postId = '';
	let analytics: DashboardStats | null = null;
	let isLoading = false;
	let error = '';
	let userPosts: any[] = [];
	let loadingPosts = true;

	$: user = $authStore.user;

	onMount(async () => {
		if (user) {
			await loadUserPosts();
		}
	});

	async function loadUserPosts() {
		if (!user) return;
		
		try {
			const { data, error: fetchError } = await supabase
				.from('posts')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false });

			if (fetchError) throw fetchError;
			userPosts = data || [];
		} catch (err) {
			console.error('Failed to load user posts:', err);
		} finally {
			loadingPosts = false;
		}
	}

	async function loadAnalytics() {
		if (!postId.trim()) {
			error = 'Please enter a post ID';
			return;
		}

		isLoading = true;
		error = '';
		analytics = null;

		try {
			const response = await fetch(`/api/analytics/post?postId=${encodeURIComponent(postId)}`);
			const data = await response.json();

			if (data.success) {
				analytics = data.analytics;
				error = '';
			} else {
				error = data.error || 'No analytics found for this post';
			}
		} catch (err) {
			error = 'Failed to load analytics';
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function formatTimeSeries(data: { timestamp: number; count: number }[]): string {
		if (!data || data.length === 0) return '';
		return data.map((d) => `${new Date(d.timestamp).toLocaleDateString()}: ${d.count}`).join('\n');
	}
</script>

<svelte:head>
	<title>My Posts - GhostPost</title>
</svelte:head>

<AuthGuard>
<div class="container mx-auto p-8 max-w-6xl space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="h1">📊 My Posts</h1>
		<a href="/compose" class="btn variant-ghost-surface">
			<span>✍️</span>
			<span>Compose New</span>
		</a>
	</div>

	<!-- User's Posts List -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">Your GhostPosts</h2>
		{#if loadingPosts}
			<div class="text-center py-8">
				<p class="opacity-75">Loading your posts...</p>
			</div>
		{:else if userPosts.length === 0}
			<div class="text-center py-8 space-y-4">
				<p class="opacity-75">You haven't created any GhostPosts yet.</p>
				<a href="/compose" class="btn variant-filled-primary">
					<span>✨</span>
					<span>Create Your First Post</span>
				</a>
			</div>
		{:else}
			<div class="table-container">
				<table class="table table-hover">
					<thead>
						<tr>
							<th>Created</th>
							<th>Visible Message</th>
							<th>Platform</th>
							<th>Post ID</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each userPosts as post}
							<tr>
								<td>{new Date(post.created_at).toLocaleDateString()}</td>
								<td class="max-w-xs truncate">{post.visible_message}</td>
								<td class="capitalize">{post.platform}</td>
								<td>
									<code class="code text-xs">{post.post_id.slice(0, 8)}...</code>
								</td>
								<td>
									<button
										class="btn btn-sm variant-ghost-primary"
										on:click={() => {
											postId = post.post_id;
											loadAnalytics();
										}}
									>
										View Analytics
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<div class="card p-6 space-y-4">
		<h2 class="h2">View Post Analytics</h2>
		<p class="text-sm opacity-75">
			Enter your post ID to see detailed analytics about who's decoding your secret messages.
		</p>

		<label class="label">
			<span>Post ID</span>
			<input
				class="input"
				type="text"
				bind:value={postId}
				placeholder="Enter your post ID (UUID)"
				on:keydown={(e) => e.key === 'Enter' && loadAnalytics()}
			/>
		</label>

		<button class="btn variant-filled-primary" on:click={loadAnalytics} disabled={isLoading}>
			{#if isLoading}
				<span>⏳ Loading...</span>
			{:else}
				<span>📊 Load Analytics</span>
			{/if}
		</button>
	</div>

	{#if error}
		<div class="card p-4 variant-ghost-error">
			<p>❌ {error}</p>
		</div>
	{/if}

	{#if analytics}
		<div class="space-y-6">
			<!-- Summary Stats -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="card p-6 variant-ghost-primary">
					<h3 class="h3 text-center">{analytics.totalDecodes}</h3>
					<p class="text-center text-sm opacity-75">Total Decodes</p>
				</div>
				<div class="card p-6 variant-ghost-secondary">
					<h3 class="h3 text-center">{analytics.uniqueUsers}</h3>
					<p class="text-center text-sm opacity-75">Unique Users</p>
				</div>
				<div class="card p-6 variant-ghost-tertiary">
					<h3 class="h3 text-center">
						{analytics.lastDecoded ? formatDate(analytics.lastDecoded) : 'N/A'}
					</h3>
					<p class="text-center text-sm opacity-75">Last Decoded</p>
				</div>
			</div>

			<!-- Platform Breakdown -->
			{#if Object.keys(analytics.platforms).length > 0}
				<div class="card p-6 space-y-4">
					<h2 class="h2">📱 Platform Breakdown</h2>
					<div class="table-container">
						<table class="table table-hover">
							<thead>
								<tr>
									<th>Platform</th>
									<th class="text-right">Decodes</th>
									<th class="text-right">Percentage</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(analytics.platforms)
									.sort(([, a], [, b]) => b - a)
									.slice(0, 10) as [platform, count]}
									<tr>
										<td class="capitalize">{platform}</td>
										<td class="text-right">{count}</td>
										<td class="text-right"
											>{((count / analytics.totalDecodes) * 100).toFixed(1)}%</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Country Breakdown -->
			{#if Object.keys(analytics.countries).length > 0}
				<div class="card p-6 space-y-4">
					<h2 class="h2">🌍 Geographic Distribution</h2>
					<div class="table-container">
						<table class="table table-hover">
							<thead>
								<tr>
									<th>Country</th>
									<th class="text-right">Decodes</th>
									<th class="text-right">Percentage</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(analytics.countries)
									.sort(([, a], [, b]) => b - a)
									.slice(0, 10) as [country, count]}
									<tr>
										<td>{country}</td>
										<td class="text-right">{count}</td>
										<td class="text-right"
											>{((count / analytics.totalDecodes) * 100).toFixed(1)}%</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Referrer Breakdown -->
			{#if Object.keys(analytics.referrers).length > 0}
				<div class="card p-6 space-y-4">
					<h2 class="h2">🔗 Referral Sources</h2>
					<div class="table-container">
						<table class="table table-hover">
							<thead>
								<tr>
									<th>Source</th>
									<th class="text-right">Decodes</th>
									<th class="text-right">Percentage</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(analytics.referrers)
									.sort(([, a], [, b]) => b - a)
									.slice(0, 10) as [referrer, count]}
									<tr>
										<td>{referrer}</td>
										<td class="text-right">{count}</td>
										<td class="text-right"
											>{((count / analytics.totalDecodes) * 100).toFixed(1)}%</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Time Series -->
			{#if analytics.timeSeriesData.length > 0}
				<div class="card p-6 space-y-4">
					<h2 class="h2">📈 Decodes Over Time</h2>
					<div class="space-y-2">
						{#each analytics.timeSeriesData.slice(-20) as dataPoint}
							<div class="flex items-center gap-4">
								<span class="text-sm opacity-75 w-40">{formatDate(dataPoint.timestamp)}</span>
								<div class="flex-1 bg-surface-700 rounded-full h-6 relative overflow-hidden">
									<div
										class="bg-primary-500 h-full rounded-full flex items-center justify-end pr-2"
										style="width: {(dataPoint.count /
											Math.max(...analytics.timeSeriesData.map((d) => d.count))) *
											100}%"
									>
										<span class="text-xs text-white font-bold">{dataPoint.count}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="card p-6 variant-ghost-surface">
		<h3 class="h3 mb-2">💡 About Analytics</h3>
		<div class="space-y-2 text-sm">
			<p>
				When you create a secret message with analytics enabled (default), we embed a unique post ID
				in the invisible payload. This allows us to track:
			</p>
			<ul class="list-disc list-inside space-y-1 ml-4">
				<li>How many times your message has been decoded</li>
				<li>Unique users who decoded it (anonymously tracked)</li>
				<li>Which platforms people came from</li>
				<li>Geographic distribution of your audience</li>
				<li>When your message was decoded over time</li>
			</ul>
			<p class="opacity-75 mt-4">
				All tracking is privacy-focused and doesn't collect personally identifiable information.
				Users are tracked anonymously via fingerprinting.
			</p>
		</div>
	</div>

	<div class="card p-6">
		<h3 class="h3 mb-4">🔍 Where to Find Your Post ID</h3>
		<p class="text-sm mb-2">
			Your post ID is automatically generated when you encode a message. You can find it:
		</p>
		<ul class="list-disc list-inside space-y-1 text-sm ml-4">
			<li>In the browser console after encoding (we'll add a visible display soon)</li>
			<li>By decoding your own message on the <a href="/decode" class="anchor">Decode page</a></li>
		</ul>
	</div>
</div>
</AuthGuard>
