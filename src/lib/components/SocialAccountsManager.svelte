<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth';

	interface SocialAccount {
		id: string;
		provider: string;
		provider_username: string | null;
		provider_email: string | null;
		is_active: boolean;
		last_used_at: string | null;
		created_at: string;
		token_expires_at: string | null;
	}

	let accounts: SocialAccount[] = [];
	let loading = true;
	let error = '';
	let connectingProvider: string | null = null;

	$: user = $authStore.user;

	const providerInfo = {
		google: { name: 'Google', icon: '🔵', color: 'bg-blue-500' },
		github: { name: 'GitHub', icon: '🐙', color: 'bg-gray-700' },
		facebook: { name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
		discord: { name: 'Discord', icon: '💬', color: 'bg-indigo-600' },
		twitter: { name: 'X (Twitter)', icon: '𝕏', color: 'bg-black' }
	};

	onMount(async () => {
		await loadAccounts();
	});

	async function loadAccounts() {
		if (!user) return;

		loading = true;
		error = '';
		try {
			const response = await fetch('/api/social-accounts');
			const data = await response.json();

			if (data.success) {
				accounts = data.accounts;
			} else {
				error = data.error || 'Failed to load connected accounts';
			}
		} catch (err) {
			error = 'Failed to load connected accounts';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function connectAccount(provider: string) {
		connectingProvider = provider;
		error = '';

		try {
			const { data, error: authError } = await authStore.signInWithProvider(
				provider as 'google' | 'github' | 'facebook' | 'discord' | 'twitter'
			);

			if (authError) {
				error = authError.message;
				connectingProvider = null;
			}
			// OAuth redirect will happen automatically
		} catch (err) {
			error = 'Failed to connect account';
			console.error(err);
			connectingProvider = null;
		}
	}

	async function disconnectAccount(accountId: string, provider: string) {
		if (
			!confirm(
				`Are you sure you want to disconnect your ${providerInfo[provider as keyof typeof providerInfo]?.name || provider} account?`
			)
		) {
			return;
		}

		try {
			const response = await fetch('/api/social-accounts/disconnect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ accountId })
			});

			const data = await response.json();

			if (data.success) {
				await loadAccounts();
			} else {
				error = data.error || 'Failed to disconnect account';
			}
		} catch (err) {
			error = 'Failed to disconnect account';
			console.error(err);
		}
	}

	async function refreshToken(accountId: string, provider: string) {
		try {
			const response = await fetch('/api/social-accounts/refresh', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ accountId })
			});

			const data = await response.json();

			if (data.success) {
				await loadAccounts();
			} else {
				// Token refresh not implemented - prompt user to reconnect
				if (
					confirm(
						`${data.error || 'Token refresh not yet implemented.'}\n\nWould you like to reconnect this account now?`
					)
				) {
					// Disconnect old account and prompt to reconnect
					await disconnectAccount(accountId, provider);
					await connectAccount(provider);
				}
			}
		} catch (err) {
			error = 'Failed to refresh token. Please disconnect and reconnect your account.';
			console.error(err);
		}
	}

	function isTokenExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	function getConnectedAccount(provider: string): SocialAccount | undefined {
		return accounts.find((acc) => acc.provider === provider && acc.is_active);
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="h2 mb-2">Connected Accounts</h2>
		<p class="text-sm opacity-75">
			Connect your social media accounts to enable automatic posting and manage your credentials
			securely.
		</p>
	</div>

	{#if error}
		<div class="card p-4 variant-ghost-error">
			<p class="text-sm">❌ {error}</p>
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-8">
			<p class="opacity-75">Loading your connected accounts...</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each Object.entries(providerInfo) as [provider, info]}
				{@const connectedAccount = getConnectedAccount(provider)}
				{@const isExpired = connectedAccount
					? isTokenExpired(connectedAccount.token_expires_at)
					: false}

				<div class="card p-4 space-y-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="text-3xl">{info.icon}</div>
							<div>
								<h3 class="font-bold">{info.name}</h3>
								{#if connectedAccount}
									<p class="text-xs opacity-75">
										{connectedAccount.provider_username ||
											connectedAccount.provider_email ||
											'Connected'}
									</p>
								{:else}
									<p class="text-xs opacity-50">Not connected</p>
								{/if}
							</div>
						</div>

						{#if connectedAccount}
							<span class="badge variant-filled-success">✓</span>
						{/if}
					</div>

					{#if connectedAccount}
						<div class="text-xs space-y-1 opacity-75">
							<p>Connected: {new Date(connectedAccount.created_at).toLocaleDateString()}</p>
							{#if connectedAccount.last_used_at}
								<p>Last used: {new Date(connectedAccount.last_used_at).toLocaleDateString()}</p>
							{/if}
							{#if isExpired}
								<p class="text-error-500 font-bold">⚠️ Token expired - reconnect required</p>
							{/if}
						</div>

						<div class="flex gap-2">
							{#if isExpired}
								<button
									class="btn btn-sm variant-filled-warning flex-1"
									on:click={() => refreshToken(connectedAccount.id, provider)}
								>
									Refresh Token
								</button>
							{/if}
							<button
								class="btn btn-sm variant-ghost-error flex-1"
								on:click={() => disconnectAccount(connectedAccount.id, provider)}
							>
								Disconnect
							</button>
						</div>
					{:else}
						<button
							class="btn btn-sm variant-filled-primary w-full"
							on:click={() => connectAccount(provider)}
							disabled={!!connectingProvider}
						>
							{#if connectingProvider === provider}
								<span>⏳ Connecting...</span>
							{:else}
								<span>Connect {info.name}</span>
							{/if}
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<div class="card p-4 variant-ghost-surface">
			<h3 class="h3 mb-2">🔒 Security & Privacy</h3>
			<div class="text-sm space-y-2 opacity-75">
				<p>
					• OAuth tokens are securely stored in the database<br />
					• You can disconnect any account at any time<br />
					• Tokens are only used for posting with your explicit permission<br />
					• We never access your data without authorization<br />
					• ⚠️ Production deployments should implement token encryption at rest
				</p>
			</div>
		</div>
	{/if}
</div>
