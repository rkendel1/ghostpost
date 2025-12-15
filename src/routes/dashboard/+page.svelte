<script lang="ts">
	import { onMount } from 'svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { authStore } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';
	import BarChart from '$lib/components/charts/BarChart.svelte';
	import CircularProgress from '$lib/components/charts/CircularProgress.svelte';

	$: user = $authStore.user;

	// Dashboard state
	let overview: any = null;
	let topPosts: any[] = [];
	let userPosts: any[] = [];
	let loadingOverview = true;
	let loadingTopPosts = true;
	let loadingPosts = true;
	let selectedPost: any = null;

	onMount(async () => {
		if (user) {
			await Promise.all([loadOverview(), loadTopPosts(), loadUserPosts()]);
		}
	});

	async function loadOverview() {
		loadingOverview = true;
		try {
			const response = await fetch('/api/dashboard/overview');
			const data = await response.json();
			if (data.success) {
				overview = data.overview;
			}
		} catch (err) {
			console.error('Failed to load overview:', err);
		} finally {
			loadingOverview = false;
		}
	}

	async function loadTopPosts() {
		loadingTopPosts = true;
		try {
			const response = await fetch('/api/dashboard/top-posts?limit=5');
			const data = await response.json();
			if (data.success) {
				topPosts = data.posts;
			}
		} catch (err) {
			console.error('Failed to load top posts:', err);
		} finally {
			loadingTopPosts = false;
		}
	}

	async function loadUserPosts() {
		loadingPosts = true;
		try {
			const { data, error } = await supabase
				.from('posts')
				.select('*')
				.eq('user_id', user!.id)
				.order('created_at', { ascending: false })
				.limit(10);

			if (error) throw error;
			userPosts = data || [];
		} catch (err) {
			console.error('Failed to load user posts:', err);
		} finally {
			loadingPosts = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getPlatformIcon(platform: string): string {
		const icons: Record<string, string> = {
			twitter: '𝕏',
			linkedin: '💼',
			facebook: '📘',
			instagram: '📷',
			tiktok: '🎵',
			discord: '💬',
			reddit: '🤖'
		};
		return icons[platform.toLowerCase()] || '📱';
	}

	$: platformChartData =
		overview?.platformDistribution
			? Object.entries(overview.platformDistribution).map(([label, value]) => ({
					label,
					value: value as number
				}))
			: [];
</script>

<svelte:head>
	<title>Dashboard - GhostPost</title>
</svelte:head>

<AuthGuard>
	<div class="container mx-auto p-4 md:p-8 max-w-7xl">
		<!-- Header -->
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
			<div>
				<h1 class="h1 flex items-center gap-3">
					<span>📊</span>
					<span>Dashboard</span>
				</h1>
				<p class="text-sm opacity-75 mt-2">
					Welcome back! Here's your GhostPost creator analytics.
				</p>
			</div>
			<a href="/compose" class="btn variant-filled-primary">
				<span>✍️</span>
				<span>Compose New Post</span>
			</a>
		</div>

		<!-- Overview Stats -->
		{#if loadingOverview}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{#each Array(4) as _}
					<div class="card p-6 animate-pulse">
						<div class="h-8 bg-surface-700 rounded w-3/4 mb-2" />
						<div class="h-4 bg-surface-700 rounded w-1/2" />
					</div>
				{/each}
			</div>
		{:else if overview}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<!-- Total Posts -->
				<div class="card p-6 variant-ghost-primary hover:variant-soft-primary transition-all">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-sm font-semibold uppercase tracking-wide opacity-75">Total Posts</h3>
						<span class="text-2xl">📝</span>
					</div>
					<div class="text-4xl font-bold mb-1">{overview.totalPosts}</div>
					<div class="text-xs opacity-75">
						{overview.recentPosts} created this week
					</div>
				</div>

				<!-- Total Decodes -->
				<div class="card p-6 variant-ghost-secondary hover:variant-soft-secondary transition-all">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-sm font-semibold uppercase tracking-wide opacity-75">Total Reveals</h3>
						<span class="text-2xl">🔓</span>
					</div>
					<div class="text-4xl font-bold mb-1">{overview.totalDecodes}</div>
					<div class="text-xs opacity-75">Secrets revealed by users</div>
				</div>

				<!-- Active Posts -->
				<div class="card p-6 variant-ghost-success hover:variant-soft-success transition-all">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-sm font-semibold uppercase tracking-wide opacity-75">Active Posts</h3>
						<span class="text-2xl">⚡</span>
					</div>
					<div class="text-4xl font-bold mb-1">{overview.activePosts}</div>
					<div class="text-xs opacity-75">Posts with reveals available</div>
				</div>

				<!-- Expired Posts -->
				<div class="card p-6 variant-ghost-warning hover:variant-soft-warning transition-all">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-sm font-semibold uppercase tracking-wide opacity-75">Sold Out</h3>
						<span class="text-2xl">🔥</span>
					</div>
					<div class="text-4xl font-bold mb-1">{overview.expiredPosts}</div>
					<div class="text-xs opacity-75">Limited edition secrets</div>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<!-- Platform Distribution -->
			<div class="card p-6">
				<h2 class="h2 mb-4 flex items-center gap-2">
					<span>📱</span>
					<span>Platform Distribution</span>
				</h2>
				{#if loadingOverview}
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="h-12 bg-surface-700 rounded animate-pulse" />
						{/each}
					</div>
				{:else if platformChartData.length > 0}
					<BarChart data={platformChartData} showPercentage={true} />
				{:else}
					<div class="text-center py-8 opacity-75">
						<p>No posts created yet</p>
						<a href="/compose" class="btn btn-sm variant-ghost-primary mt-4">
							Create Your First Post
						</a>
					</div>
				{/if}
			</div>

			<!-- Top Performing Posts -->
			<div class="card p-6">
				<h2 class="h2 mb-4 flex items-center gap-2">
					<span>🏆</span>
					<span>Top Performing Posts</span>
				</h2>
				{#if loadingTopPosts}
					<div class="space-y-3">
						{#each Array(5) as _}
							<div class="h-16 bg-surface-700 rounded animate-pulse" />
						{/each}
					</div>
				{:else if topPosts.length > 0}
					<div class="space-y-3">
						{#each topPosts as post, index}
							<div
								class="card p-4 variant-ghost-surface hover:variant-soft-primary transition-all cursor-pointer"
								on:click={() => (selectedPost = post)}
								on:keydown={(e) => e.key === 'Enter' && (selectedPost = post)}
								role="button"
								tabindex="0"
							>
								<div class="flex items-center gap-4">
									<div
										class="flex-shrink-0 w-10 h-10 rounded-full variant-filled-primary flex items-center justify-center font-bold"
									>
										#{index + 1}
									</div>
									<div class="flex-1 min-w-0">
										<div class="font-medium truncate">{post.visible_message}</div>
										<div class="flex items-center gap-2 text-xs opacity-75 mt-1">
											<span>{getPlatformIcon(post.platform)} {post.platform}</span>
											<span>•</span>
											<span>{formatDate(post.created_at)}</span>
										</div>
									</div>
									<div class="text-right">
										<div class="text-xl font-bold">{post.decodes}</div>
										<div class="text-xs opacity-75">reveals</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8 opacity-75">
						<p>No posts with reveals yet</p>
						<p class="text-xs mt-2">Share your posts to start tracking engagement!</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Recent Posts -->
		<div class="card p-6">
			<div class="flex justify-between items-center mb-6">
				<h2 class="h2 flex items-center gap-2">
					<span>📋</span>
					<span>Recent Posts</span>
				</h2>
				<a href="/compose" class="btn btn-sm variant-ghost-primary">
					<span>➕</span>
					<span>New Post</span>
				</a>
			</div>

			{#if loadingPosts}
				<div class="space-y-3">
					{#each Array(5) as _}
						<div class="h-20 bg-surface-700 rounded animate-pulse" />
					{/each}
				</div>
			{:else if userPosts.length > 0}
				<div class="table-container">
					<table class="table table-hover">
						<thead>
							<tr>
								<th>Platform</th>
								<th>Message</th>
								<th>Created</th>
								<th>Post ID</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each userPosts as post}
								<tr>
									<td>
										<div class="flex items-center gap-2">
											<span class="text-xl">{getPlatformIcon(post.platform)}</span>
											<span class="capitalize">{post.platform}</span>
										</div>
									</td>
									<td>
										<div class="max-w-xs truncate font-medium">{post.visible_message}</div>
									</td>
									<td>
										<span class="text-sm opacity-75">{formatDate(post.created_at)}</span>
									</td>
									<td>
										<code class="code text-xs">{post.post_id.slice(0, 8)}...</code>
									</td>
									<td>
										<div class="flex items-center gap-2">
											<a
												href="/analytics?postId={post.post_id}"
												class="btn btn-sm variant-ghost-primary"
											>
												📊 Analytics
											</a>
											<button class="btn btn-sm variant-ghost-surface" title="Share">
												🔗
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="text-center py-12 space-y-4">
					<div class="text-6xl">👻</div>
					<div>
						<h3 class="h3 mb-2">No Posts Yet</h3>
						<p class="opacity-75 mb-4">Create your first GhostPost to get started!</p>
						<a href="/compose" class="btn variant-filled-primary">
							<span>✨</span>
							<span>Create Your First Post</span>
						</a>
					</div>
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
			<a href="/compose" class="card p-6 hover:variant-soft-primary transition-all text-center">
				<div class="text-4xl mb-2">✍️</div>
				<h3 class="h3 mb-2">Compose Post</h3>
				<p class="text-sm opacity-75">Create a new secret message</p>
			</a>

			<a href="/analytics" class="card p-6 hover:variant-soft-secondary transition-all text-center">
				<div class="text-4xl mb-2">📊</div>
				<h3 class="h3 mb-2">View Analytics</h3>
				<p class="text-sm opacity-75">Deep dive into post performance</p>
			</a>

			<a href="/settings" class="card p-6 hover:variant-soft-tertiary transition-all text-center">
				<div class="text-4xl mb-2">⚙️</div>
				<h3 class="h3 mb-2">Settings</h3>
				<p class="text-sm opacity-75">Manage your account</p>
			</a>
		</div>
	</div>
</AuthGuard>
