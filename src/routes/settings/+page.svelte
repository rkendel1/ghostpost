<script lang="ts">
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import SocialAccountsManager from '$lib/components/SocialAccountsManager.svelte';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	$: user = $authStore.user;

	let activeTab: 'accounts' | 'profile' | 'security' = 'accounts';

	async function handleSignOut() {
		if (confirm('Are you sure you want to sign out?')) {
			await authStore.signOut();
			await goto('/');
		}
	}
</script>

<svelte:head>
	<title>Account Settings - GhostPost</title>
</svelte:head>

<AuthGuard>
	<div class="container mx-auto p-8 max-w-6xl space-y-6">
		<div class="flex justify-between items-center">
			<h1 class="h1">⚙️ Account Settings</h1>
			<a href="/dashboard" class="btn variant-ghost-surface">
				<span>←</span>
				<span>Back to Dashboard</span>
			</a>
		</div>

		<!-- Tab Navigation -->
		<div class="card">
			<nav class="flex border-b border-surface-500">
				<button
					class="px-6 py-3 font-semibold transition-colors"
					class:border-b-2={activeTab === 'accounts'}
					class:border-primary-500={activeTab === 'accounts'}
					class:text-primary-500={activeTab === 'accounts'}
					on:click={() => (activeTab = 'accounts')}
				>
					🔗 Connected Accounts
				</button>
				<button
					class="px-6 py-3 font-semibold transition-colors"
					class:border-b-2={activeTab === 'profile'}
					class:border-primary-500={activeTab === 'profile'}
					class:text-primary-500={activeTab === 'profile'}
					on:click={() => (activeTab = 'profile')}
				>
					👤 Profile
				</button>
				<button
					class="px-6 py-3 font-semibold transition-colors"
					class:border-b-2={activeTab === 'security'}
					class:border-primary-500={activeTab === 'security'}
					class:text-primary-500={activeTab === 'security'}
					on:click={() => (activeTab = 'security')}
				>
					🔒 Security
				</button>
			</nav>
		</div>

		<!-- Tab Content -->
		<div class="card p-6">
			{#if activeTab === 'accounts'}
				<SocialAccountsManager />
			{:else if activeTab === 'profile'}
				<div class="space-y-6">
					<div>
						<h2 class="h2 mb-2">Profile Information</h2>
						<p class="text-sm opacity-75">Manage your account profile and preferences.</p>
					</div>

					<div class="space-y-4">
						<label class="label">
							<span>Email</span>
							<input type="email" class="input" value={user?.email || ''} disabled readonly />
							<p class="text-xs opacity-75 mt-1">Email cannot be changed at this time.</p>
						</label>

						<label class="label">
							<span>User ID</span>
							<input
								type="text"
								class="input font-mono text-sm"
								value={user?.id || ''}
								disabled
								readonly
							/>
						</label>

						<label class="label">
							<span>Account Created</span>
							<input
								type="text"
								class="input"
								value={user?.created_at ? new Date(user.created_at).toLocaleString() : ''}
								disabled
								readonly
							/>
						</label>
					</div>
				</div>
			{:else if activeTab === 'security'}
				<div class="space-y-6">
					<div>
						<h2 class="h2 mb-2">Security Settings</h2>
						<p class="text-sm opacity-75">Manage your account security and authentication.</p>
					</div>

					<div class="space-y-4">
						<div class="card p-4 variant-ghost-surface">
							<h3 class="h3 mb-2">Authentication Method</h3>
							<p class="text-sm opacity-75">
								{#if user?.app_metadata?.provider}
									You're signed in with: <strong class="capitalize"
										>{user.app_metadata.provider}</strong
									>
								{:else}
									You're signed in with email and password.
								{/if}
							</p>
						</div>

						{#if user?.app_metadata?.provider === 'email'}
							<div class="card p-4 space-y-3">
								<h3 class="font-bold">Change Password</h3>
								<p class="text-sm opacity-75">
									To change your password, sign out and use the "Forgot Password" option on the
									login page.
								</p>
							</div>
						{/if}

						<div class="card p-4 variant-ghost-warning">
							<h3 class="font-bold mb-2">⚠️ Danger Zone</h3>
							<p class="text-sm opacity-75 mb-4">
								These actions are permanent and cannot be undone.
							</p>
							<button class="btn variant-filled-error" on:click={handleSignOut}>
								<span>🚪</span>
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="card p-4 variant-ghost-surface">
			<h3 class="h3 mb-2">💡 About Your Account</h3>
			<div class="text-sm space-y-2 opacity-75">
				<p>
					Your GhostPost account gives you access to advanced features like post analytics,
					unlimited storage, and the ability to connect social media accounts for seamless posting.
				</p>
				<p>
					All your data is securely stored and encrypted. You have full control over your
					information and can delete your account at any time.
				</p>
			</div>
		</div>
	</div>
</AuthGuard>
