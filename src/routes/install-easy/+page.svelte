<script lang="ts">
	import { onMount } from 'svelte';

	let step = $state(2);
	let tampermonkeyInstalled = $state(false);
	let userscriptInstalled = $state(false);
	let installedOverlayVersion = $state<string | null>(null);
	const currentOverlayVersion = '2.7.2';
	let browserType = $state<'chrome' | 'firefox' | 'safari' | 'edge' | 'other'>('other');
	let verificationComplete = $state(false);

	// Detect browser
	function detectBrowser() {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('edg/')) {
			browserType = 'edge';
		} else if (ua.includes('chrome') && !ua.includes('edg')) {
			browserType = 'chrome';
		} else if (ua.includes('firefox')) {
			browserType = 'firefox';
		} else if (ua.includes('safari') && !ua.includes('chrome')) {
			browserType = 'safari';
		} else {
			browserType = 'other';
		}
	}

	function installTampermonkey() {
		let url = '';
		if (browserType === 'chrome' || browserType === 'edge') {
			url =
				'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo';
		} else if (browserType === 'firefox') {
			url = 'https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/';
		} else if (browserType === 'safari') {
			url = 'https://apps.apple.com/app/tampermonkey/id1482490089';
		} else {
			url = 'https://www.tampermonkey.net/';
		}

		window.open(url, '_blank');
		step = 2;
	}

	function installUserscript() {
		const scriptUrl = `${window.location.origin}/ghostpost-reveal.user.js`;
		window.location.href = `https://www.tampermonkey.net/script_installation.php#url=${scriptUrl}`;
	}

	// Note: openExtensionSettings removed as we now provide inline instructions in Step 3

	onMount(() => {
		detectBrowser();

		// Browser extension inventories are private. The installed Ghostpost userscript
		// provides a reliable signal by injecting its overlay button on this page.
		const detectInstalledOverlay = () => {
			const overlayButton = document.getElementById('ghostpost-reveal-button');
			if (overlayButton) {
				installedOverlayVersion = overlayButton.dataset.version || 'unknown';
				tampermonkeyInstalled = true;
				userscriptInstalled = installedOverlayVersion === currentOverlayVersion;
				step = userscriptInstalled ? 4 : 2;
				return true;
			}
			return false;
		};

		if (detectInstalledOverlay()) return;
		const detectionTimer = window.setInterval(() => {
			if (detectInstalledOverlay()) window.clearInterval(detectionTimer);
		}, 500);

		return () => window.clearInterval(detectionTimer);
	});
</script>

<svelte:head>
	<title>Easy Install: Ghostpost Reveal Userscript</title>
	<meta
		name="description"
		content="Install Ghostpost Reveal userscript in 2 simple steps. Automatically detect hidden messages on any website."
	/>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-8">
	<!-- iPhone/Mobile Notice -->
	<div class="card p-6 variant-ghost-primary space-y-4">
		<div class="flex items-center gap-3">
			<span class="text-3xl">📱</span>
			<div>
				<h3 class="h3 text-sm">On iPhone or iPad?</h3>
				<p class="text-xs opacity-80 mt-1">
					We have a special installation guide for iOS users. <a
						href="/install/iphone"
						class="anchor">Switch to iPhone guide →</a
					>
				</p>
			</div>
		</div>
	</div>

	<!-- Hero Section -->
	<div class="card p-10 space-y-4 text-center variant-gradient-primary-secondary">
		<div class="text-7xl mb-4">👻</div>
	<h1 class="h1 text-white">Ghostpost Reveal Overlay</h1>
		<p class="text-xl text-white/90 max-w-2xl mx-auto">
			Install in 2 easy steps. No configuration needed. Works everywhere.
		</p>
	</div>

	<!-- Progress Indicator -->
	<div class="flex justify-center items-center gap-4">
		<div class="flex items-center gap-2">
			<div
				class="badge {step >= 1
					? 'variant-filled-primary'
					: 'variant-soft-surface'} text-lg px-4 py-2"
			>
				{step >= 2 ? '✓' : '1'}
			</div>
			<span class="text-sm font-semibold">Install Tampermonkey</span>
		</div>
		<div class="text-2xl opacity-30">→</div>
		<div class="flex items-center gap-2">
			<div
				class="badge {step >= 2
					? 'variant-filled-primary'
					: 'variant-soft-surface'} text-lg px-4 py-2"
			>
				{step >= 3 ? '✓' : '2'}
			</div>
			<span class="text-sm font-semibold">Install Overlay</span>
		</div>
		<div class="text-2xl opacity-30">→</div>
		<div class="flex items-center gap-2">
			<div
				class="badge {step >= 4
					? 'variant-filled-success'
					: 'variant-soft-surface'} text-lg px-4 py-2"
			>
				{step >= 4 ? '✓' : '3'}
			</div>
			<span class="text-sm font-semibold">Done!</span>
		</div>
	</div>

	<!-- Step 1: Install Tampermonkey -->
	{#if step === 1}
		<div class="card p-8 space-y-6">
			<div class="text-center">
				<h2 class="h2 mb-4">Step 1: Install Tampermonkey</h2>
				<p class="text-lg mb-6">Tampermonkey lets you run userscripts. It's a one-time install.</p>
			</div>

			<div class="card p-6 variant-ghost-primary space-y-4">
				<div class="text-center text-6xl">🐒</div>
				<h3 class="h3 text-center">Install Tampermonkey</h3>

				<ul class="space-y-2 text-sm">
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Free and open source</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Over 10 million users</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Works with all major browsers</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>One-time setup</span>
					</li>
				</ul>

				<button class="btn variant-filled-primary w-full btn-xl" on:click={installTampermonkey}>
					<span class="text-2xl">⚡</span>
					<span class="text-xl">Install Tampermonkey</span>
				</button>

				<p class="text-xs text-center opacity-70">
					This will open the
					{#if browserType === 'chrome'}
						Chrome Web Store
					{:else if browserType === 'firefox'}
						Firefox Add-ons
					{:else if browserType === 'edge'}
						Edge Add-ons
					{:else if browserType === 'safari'}
						App Store
					{:else}
						Tampermonkey website
					{/if}
				</p>
			</div>

			<div class="card p-4 variant-ghost-surface text-center text-sm">
				<p class="mb-2">Already have Tampermonkey installed?</p>
				<button class="btn btn-sm variant-soft-primary" on:click={() => (step = 2)}>
					Skip to Step 2 →
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 2: Install Userscript -->
		{#if step === 2}
			<div class="card p-8 space-y-6">
				{#if installedOverlayVersion && installedOverlayVersion !== currentOverlayVersion}
					<div class="card p-4 variant-ghost-warning">
						<p class="font-semibold">Overlay update required</p>
						<p class="text-sm mt-1">
							You have v{installedOverlayVersion}; v{currentOverlayVersion} fixes hosted-message
							decoding and corrupted characters. Reinstall below to update.
						</p>
					</div>
				{/if}
			<div class="text-center">
				<h2 class="h2 mb-4">Step 2: Install the Ghostpost Overlay</h2>
				<p class="text-lg mb-6">
					Click the button below to install the userscript. Tampermonkey will prompt you.
				</p>
			</div>

			<div class="card p-6 variant-ghost-success space-y-4">
				<div class="text-center text-6xl">👻</div>

				<div class="space-y-3">
					<p class="text-sm font-semibold">What happens when you click:</p>
					<ol class="list-decimal list-inside space-y-2 text-sm ml-4">
						<li>Tampermonkey will open with the userscript details</li>
						<li>You'll see a preview of the script (it's safe!)</li>
						<li>Click "Install" in Tampermonkey</li>
						<li>Done! The 👻 button will appear on all websites</li>
					</ol>
				</div>

				<button class="btn variant-filled-success w-full btn-xl" on:click={installUserscript}>
					<span class="text-2xl">🚀</span>
					<span class="text-xl">Install Ghostpost Overlay</span>
				</button>

				{#if browserType === 'chrome' || browserType === 'edge'}
					<div class="card p-4 variant-ghost-warning text-sm">
						<p class="font-semibold mb-2">Required by current Chrome/Edge versions</p>
						<ol class="list-decimal list-inside space-y-1 text-xs">
							<li>Right-click the Tampermonkey icon and choose “Manage extension.”</li>
							<li>Turn on “Allow User Scripts.”</li>
							<li>If that switch is unavailable, enable Developer Mode on the extensions page.</li>
						</ol>
						<a
							href="https://www.tampermonkey.net/faq.php?q=Q209"
							target="_blank"
							rel="noreferrer"
							class="anchor text-xs inline-block mt-2">Tampermonkey’s official instructions</a
						>
					</div>
				{/if}

				<div class="card p-4 variant-ghost-warning text-sm">
					<p class="font-semibold mb-2">⚡ Auto-Configuration Included:</p>
					<ul class="list-disc list-inside space-y-1 ml-4 text-xs">
						<li>Auto-updates enabled (script stays current automatically)</li>
						<li>Runs on all websites (except banking/login pages for security)</li>
						<li>Optimized performance settings</li>
						<li>Privacy-focused (inline messages process locally; hosted secrets load from Ghostpost)</li>
					</ul>
				</div>
			</div>

			<div class="text-center">
				<button class="btn btn-sm variant-ghost-surface" on:click={() => (step = 1)}>
					← Back to Step 1
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3: Verification & Optional Settings -->
	{#if step === 3}
		<div class="card p-8 space-y-6">
			<div class="text-center">
				<h2 class="h2 mb-4">🎉 Almost Done!</h2>
				<p class="text-lg mb-6">
					Verify the installation and optionally enable incognito mode support.
				</p>
			</div>

			<!-- Verification -->
			<div class="card p-6 variant-ghost-success space-y-4">
				<h3 class="h3">✅ Verify Installation</h3>
				<p class="text-sm">Did you see Tampermonkey's installation dialog and click "Install"?</p>

				<div class="flex gap-4">
					<button class="btn variant-filled-success flex-1" on:click={() => (step = 4)}>
						<span>✓</span>
						<span>Yes, installed successfully!</span>
					</button>
					<button class="btn variant-soft-error flex-1" on:click={() => (step = 2)}>
						<span>↺</span>
						<span>No, try again</span>
					</button>
				</div>
			</div>

			<!-- Optional: Incognito Setup -->
			<div class="card p-6 variant-ghost-primary space-y-4">
				<h3 class="h3">🔒 Optional: Enable Incognito Mode (Recommended)</h3>
				<p class="text-sm">
					To use Ghostpost Reveal in incognito/private windows, you need to enable Tampermonkey in
					incognito mode.
				</p>

				<details class="space-y-3">
					<summary class="cursor-pointer font-semibold text-sm"
						>Show instructions for {browserType} →</summary
					>

					<div class="mt-3 p-4 bg-surface-100-900 rounded space-y-3 text-sm">
						{#if browserType === 'chrome'}
							<p class="font-semibold">Chrome:</p>
							<ol class="list-decimal list-inside space-y-2 ml-4">
								<li>Type <code class="code">chrome://extensions</code> in your address bar</li>
								<li>Find "Tampermonkey" in the list</li>
								<li>Click "Details"</li>
								<li>Scroll down and enable "Allow in Incognito"</li>
							</ol>
						{:else if browserType === 'edge'}
							<p class="font-semibold">Edge:</p>
							<ol class="list-decimal list-inside space-y-2 ml-4">
								<li>Type <code class="code">edge://extensions</code> in your address bar</li>
								<li>Find "Tampermonkey" in the list</li>
								<li>Click "Details"</li>
								<li>Enable "Allow in InPrivate"</li>
							</ol>
						{:else if browserType === 'firefox'}
							<p class="font-semibold">Firefox:</p>
							<ol class="list-decimal list-inside space-y-2 ml-4">
								<li>Type <code class="code">about:addons</code> in your address bar</li>
								<li>Click on "Tampermonkey"</li>
								<li>Go to the "Details" tab</li>
								<li>Scroll to "Run in Private Windows" and select "Allow"</li>
							</ol>
						{:else}
							<p>
								Open your browser's extensions page and enable Tampermonkey to run in
								private/incognito windows.
							</p>
						{/if}

						<p class="text-xs opacity-70 mt-3">
							This is optional but recommended for full functionality.
						</p>
					</div>
				</details>
			</div>
		</div>
	{/if}

	<!-- Step 4: Success & Testing -->
	{#if step === 4}
		<div class="space-y-6">
			<div class="card p-8 variant-ghost-success space-y-6 text-center">
				<div class="text-8xl">🎉</div>
				<h2 class="h2">Installation Complete!</h2>
				<p class="text-lg">The Ghostpost Reveal userscript is now installed and ready to use.</p>

				<div class="card p-6 variant-soft-success space-y-4">
					<h3 class="h3 text-sm">What to expect:</h3>
					<ul class="text-left list-disc list-inside space-y-2 text-sm ml-4">
						<li>A floating 👻 button will appear on every website (bottom-right corner)</li>
						<li>When hidden messages are detected, a red counter badge will show</li>
						<li>Click the button to reveal all hidden messages on the page</li>
						<li>The script updates automatically - no maintenance needed!</li>
					</ul>
				</div>

				<div class="flex gap-4 justify-center">
					<a href="/demo" class="btn variant-filled-primary btn-lg">
						<span>🧪</span>
						<span>Test on Demo Page</span>
					</a>
					<a href="/" class="btn variant-soft-surface btn-lg">
						<span>🏠</span>
						<span>Back to Home</span>
					</a>
				</div>
			</div>

			<!-- Troubleshooting Card -->
			<div class="card p-6 space-y-4">
				<h3 class="h3">❓ Quick Troubleshooting</h3>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">Button not appearing?</summary>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>1. Refresh the page (F5 or Cmd+R)</p>
						<p>2. Check Tampermonkey icon - is it enabled?</p>
						<p>3. Open Tampermonkey dashboard and verify "Ghostpost Reveal" is enabled</p>
						<p>4. Try our <a href="/demo" class="anchor">demo page</a> to test</p>
					</div>
				</details>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">Need to configure settings?</summary
					>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>
							The userscript is pre-configured with optimal settings. If you need to change
							anything:
						</p>
						<p>1. Click the Tampermonkey icon in your browser toolbar</p>
						<p>2. Click "Dashboard"</p>
						<p>3. Find "Ghostpost Reveal" and click the name to edit</p>
					</div>
				</details>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">How do auto-updates work?</summary>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>The userscript checks for updates automatically every 24 hours.</p>
						<p>When an update is found, Tampermonkey will install it automatically.</p>
						<p>You'll always have the latest features and bug fixes with zero effort!</p>
					</div>
				</details>
			</div>
		</div>
	{/if}

	<!-- Features Section (shown on all steps) -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">✨ What You Get</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="space-y-2">
				<div class="text-4xl text-center">🔍</div>
				<h3 class="h3 text-center text-sm">Auto-Detect</h3>
				<p class="text-xs text-center opacity-80">
					Automatically scans every webpage for hidden messages
				</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔄</div>
				<h3 class="h3 text-center text-sm">Auto-Update</h3>
				<p class="text-xs text-center opacity-80">Always stays current with automatic updates</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔒</div>
				<h3 class="h3 text-center text-sm">Privacy-First</h3>
				<p class="text-xs text-center opacity-80">All processing happens locally in your browser</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">⚡</div>
				<h3 class="h3 text-center text-sm">One-Click Reveal</h3>
				<p class="text-xs text-center opacity-80">Instantly decode messages with a single click</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🌐</div>
				<h3 class="h3 text-center text-sm">Works Everywhere</h3>
				<p class="text-xs text-center opacity-80">Compatible with all websites and platforms</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🛡️</div>
				<h3 class="h3 text-center text-sm">Security-Focused</h3>
				<p class="text-xs text-center opacity-80">
					Excludes sensitive sites like banking automatically
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	.btn-xl {
		padding: 1.5rem 2rem;
		font-size: 1.25rem;
	}

	.btn-lg {
		padding: 1rem 1.5rem;
		font-size: 1.125rem;
	}

	details {
		cursor: pointer;
		padding: 1rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.05);
		margin-bottom: 0.5rem;
	}

	details:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	details[open] {
		background: rgba(0, 0, 0, 0.1);
	}

	code.code {
		background: rgba(0, 0, 0, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875rem;
	}
</style>
