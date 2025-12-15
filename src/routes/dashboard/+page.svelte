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
	let postAnalytics: Record<string, any> = {}; // Store analytics for each post
	let expandedPostIds: Set<string> = new Set(); // Track which posts have expanded analytics
	let decryptedSecrets: Record<string, string> = {}; // Store decrypted secrets
	let loadingSecrets: Set<string> = new Set(); // Track which secrets are being loaded
	let decryptErrors: Record<string, string> = {}; // Store decryption errors

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
		if (!user) return;

		loadingPosts = true;
		try {
			const { data, error } = await supabase
				.from('posts')
				.select('*')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(10);

			if (error) throw error;
			userPosts = data || [];

			// Load analytics for each post
			await loadPostAnalytics();
		} catch (err) {
			console.error('Failed to load user posts:', err);
		} finally {
			loadingPosts = false;
		}
	}

	async function loadPostAnalytics() {
		// Fetch analytics for all user posts in parallel
		// Note: Limited to 10 posts by the query limit in loadUserPosts()
		// For larger datasets, consider implementing batching or pagination
		const analyticsPromises = userPosts.map(async (post) => {
			try {
				const response = await fetch(`/api/analytics/post?postId=${post.post_id}`);
				const data = await response.json();
				if (data.success && data.analytics) {
					// Pre-sort the data for better performance
					const analytics = data.analytics;
					analytics.platformsSorted = Object.entries(analytics.platforms || {})
						.sort(([, a], [, b]) => (b as number) - (a as number))
						.map(([platform, count]) => ({ platform, count }));
					analytics.countriesSorted = Object.entries(analytics.countries || {})
						.sort(([, a], [, b]) => (b as number) - (a as number))
						.slice(0, 10)
						.map(([country, count]) => ({ country, count }));
					analytics.referrersSorted = Object.entries(analytics.referrers || {})
						.sort(([, a], [, b]) => (b as number) - (a as number))
						.slice(0, 5)
						.map(([referrer, count]) => ({ referrer, count }));
					postAnalytics[post.post_id] = analytics;
				} else {
					// Default empty analytics if none found
					postAnalytics[post.post_id] = {
						totalDecodes: 0,
						uniqueUsers: 0,
						platforms: {},
						countries: {},
						platformsSorted: [],
						countriesSorted: [],
						referrersSorted: []
					};
				}
			} catch (err) {
				console.error(`Failed to load analytics for post ${post.post_id}:`, err);
				postAnalytics[post.post_id] = {
					totalDecodes: 0,
					uniqueUsers: 0,
					platforms: {},
					countries: {},
					platformsSorted: [],
					countriesSorted: [],
					referrersSorted: []
				};
			}
		});

		await Promise.all(analyticsPromises);
		// Trigger reactivity
		postAnalytics = { ...postAnalytics };
	}

	function toggleAnalytics(postId: string) {
		if (expandedPostIds.has(postId)) {
			expandedPostIds.delete(postId);
		} else {
			expandedPostIds.add(postId);
		}
		expandedPostIds = new Set(expandedPostIds);
	}

	function copyPostLink(postId: string) {
		const url = `${window.location.origin}/analytics?postId=${postId}`;
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard
				.writeText(url)
				.then(() => {
					// TODO: Replace with toast notification for better UX
					alert('Analytics link copied to clipboard!');
				})
				.catch((err) => {
					console.error('Failed to copy link:', err);
					// TODO: Replace with toast notification for better UX
					alert('Failed to copy link. Please try again.');
				});
		} else {
			// Fallback for browsers that don't support clipboard API
			// TODO: Replace with modal or copyable text input for better UX
			alert(`Copy this link: ${url}`);
		}
	}

	async function viewSecret(postId: string) {
		// If already decrypted, hide it
		if (decryptedSecrets[postId]) {
			delete decryptedSecrets[postId];
			delete decryptErrors[postId];
			decryptedSecrets = { ...decryptedSecrets };
			decryptErrors = { ...decryptErrors };
			return;
		}

		// Start loading
		loadingSecrets.add(postId);
		loadingSecrets = new Set(loadingSecrets);
		delete decryptErrors[postId];
		decryptErrors = { ...decryptErrors };

		try {
			const response = await fetch(`/api/posts/decrypt?post_id=${postId}`);
			const data = await response.json();

			if (data.success) {
				decryptedSecrets[postId] = data.secret_message;
				decryptedSecrets = { ...decryptedSecrets };
			} else {
				decryptErrors[postId] = data.error || 'Failed to decrypt secret';
				decryptErrors = { ...decryptErrors };
			}
		} catch (err) {
			console.error('Decryption request failed');
			decryptErrors[postId] = 'Network error. Please try again.';
			decryptErrors = { ...decryptErrors };
		} finally {
			loadingSecrets.delete(postId);
			loadingSecrets = new Set(loadingSecrets);
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

	$: platformChartData = overview?.platformDistribution
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
				<div class="space-y-4">
					{#each userPosts as post}
						<div class="card variant-ghost-surface">
							<!-- Main post info -->
							<div class="p-4">
								<div class="flex items-start justify-between gap-4">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-3 mb-2">
											<span class="text-2xl">{getPlatformIcon(post.platform)}</span>
											<div class="flex-1">
												<div class="font-medium text-lg">{post.visible_message}</div>
												<div class="flex items-center gap-2 text-sm opacity-75 mt-1">
													<span class="capitalize">{post.platform}</span>
													<span>•</span>
													<span>{formatDate(post.created_at)}</span>
													<span>•</span>
													<code class="code text-xs">{post.post_id.slice(0, 8)}...</code>
												</div>
											</div>
										</div>
									</div>
									<div class="flex gap-2">
										<button
											class="btn btn-sm variant-ghost-primary"
											on:click={() => toggleAnalytics(post.post_id)}
											title="Toggle analytics"
										>
											{expandedPostIds.has(post.post_id) ? '📊 Hide' : '📊 Show'} Analytics
										</button>
										<button
											class="btn btn-sm variant-ghost-secondary"
											on:click={() => viewSecret(post.post_id)}
											title={decryptedSecrets[post.post_id] ? 'Hide secret' : 'View secret message'}
											disabled={loadingSecrets.has(post.post_id)}
										>
											{#if loadingSecrets.has(post.post_id)}
												⏳
											{:else if decryptedSecrets[post.post_id]}
												🔓 Hide
											{:else}
												🔒 View
											{/if}
										</button>
										<button
											class="btn btn-sm variant-ghost-surface"
											on:click={() => copyPostLink(post.post_id)}
											title="Copy analytics link"
										>
											🔗
										</button>
									</div>
								</div>

								<!-- Decrypted Secret Display -->
								{#if decryptedSecrets[post.post_id]}
									<div class="px-4 pb-4 border-t border-surface-400 pt-4">
										<div class="card p-4 variant-soft-warning">
											<div class="flex items-start gap-3">
												<span class="text-2xl">🔓</span>
												<div class="flex-1">
													<h4 class="font-semibold mb-2 text-sm">Secret Message</h4>
													<div class="bg-surface-900 p-3 rounded code text-sm break-words">
														{decryptedSecrets[post.post_id]}
													</div>
													<p class="text-xs opacity-75 mt-2">
														⚠️ This is your private secret. Only you can see this.
													</p>
												</div>
											</div>
										</div>
									</div>
								{/if}

								<!-- Decryption Error Display -->
								{#if decryptErrors[post.post_id]}
									<div class="px-4 pb-4 border-t border-surface-400 pt-4">
										<div class="card p-4 variant-soft-error">
											<div class="flex items-start gap-3">
												<span class="text-2xl">⚠️</span>
												<div class="flex-1">
													<h4 class="font-semibold mb-2 text-sm">Decryption Error</h4>
													<p class="text-sm">{decryptErrors[post.post_id]}</p>
													<button
														class="btn btn-sm variant-ghost-surface mt-2"
														on:click={() => viewSecret(post.post_id)}
													>
														Try Again
													</button>
												</div>
											</div>
										</div>
									</div>
								{/if}

								<!-- Inline analytics summary (always visible) -->
								{#if postAnalytics[post.post_id]}
									<div
										class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-surface-400"
									>
										<div class="text-center">
											<div class="text-2xl font-bold">
												{postAnalytics[post.post_id].totalDecodes || 0}
											</div>
											<div class="text-xs opacity-75">Total Reveals</div>
										</div>
										<div class="text-center">
											<div class="text-2xl font-bold">
												{postAnalytics[post.post_id].uniqueUsers || 0}
											</div>
											<div class="text-xs opacity-75">Unique Users</div>
										</div>
										<div class="text-center">
											<div class="text-2xl font-bold">
												{Object.keys(postAnalytics[post.post_id].countries || {}).length}
											</div>
											<div class="text-xs opacity-75">Countries</div>
										</div>
										<div class="text-center">
											<div class="text-2xl font-bold">
												{Object.keys(postAnalytics[post.post_id].platforms || {}).length}
											</div>
											<div class="text-xs opacity-75">Platforms</div>
										</div>
									</div>
								{/if}
							</div>

							<!-- Expanded analytics details -->
							{#if expandedPostIds.has(post.post_id) && postAnalytics[post.post_id]}
								<div class="px-4 pb-4 space-y-4 border-t border-surface-400 pt-4">
									<!-- Platform breakdown -->
									{#if postAnalytics[post.post_id].platformsSorted?.length > 0}
										<div>
											<h4 class="font-semibold mb-2 text-sm">Platform Sources</h4>
											<div class="flex flex-wrap gap-2">
												{#each postAnalytics[post.post_id].platformsSorted as { platform, count }}
													<span class="badge variant-filled-secondary capitalize">
														{platform}: {count}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Country breakdown -->
									{#if postAnalytics[post.post_id].countriesSorted?.length > 0}
										<div>
											<h4 class="font-semibold mb-2 text-sm">Geographic Reach</h4>
											<div class="flex flex-wrap gap-2">
												{#each postAnalytics[post.post_id].countriesSorted as { country, count }}
													<span class="badge variant-filled-primary">
														{country}: {count}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Referrer breakdown -->
									{#if postAnalytics[post.post_id].referrersSorted?.length > 0}
										<div>
											<h4 class="font-semibold mb-2 text-sm">Traffic Sources</h4>
											<div class="flex flex-wrap gap-2">
												{#each postAnalytics[post.post_id].referrersSorted as { referrer, count }}
													<span class="badge variant-filled-tertiary">
														{referrer}: {count}
													</span>
												{/each}
											</div>
										</div>
									{/if}

									<div class="flex gap-2 pt-2">
										<a
											href="/analytics?postId={post.post_id}"
											class="btn btn-sm variant-ghost-surface"
										>
											View Full Analytics Page
										</a>
									</div>
								</div>
							{/if}
						</div>
					{/each}
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
