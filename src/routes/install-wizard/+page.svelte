<script lang="ts">
	import { onMount } from 'svelte';

	let extensionInstalled = $state(false);
	let userscriptInstalled = $state(false);
	let browserType = $state<'chrome' | 'firefox' | 'safari' | 'edge' | 'other'>('other');
	let installMethod = $state<'extension' | 'userscript' | null>(null);

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

	function installExtension() {
		const download = document.createElement('a');
		download.href = '/ghostpost-reveal-extension.zip';
		download.download = 'ghostpost-reveal-extension.zip';
		document.body.appendChild(download);
		download.click();
		download.remove();
		installMethod = 'extension';
	}

	function installUserscript() {
		window.location.href = '/ghostpost-reveal.user.js';
		installMethod = 'userscript';
		setTimeout(() => {
			userscriptInstalled = true;
		}, 1000);
	}

	onMount(() => {
		detectBrowser();
	});
</script>

<svelte:head>
	<title>Install Ghostpost Reveal - One-Click Hidden Message Detection</title>
	<meta
		name="description"
		content="Install Ghostpost Reveal in one click. Automatically detect and decode hidden messages on any website. No configuration needed."
	/>
</svelte:head>

<div class="container mx-auto p-8 max-w-5xl space-y-8">
	<!-- Hero Section -->
	<div class="card p-10 space-y-4 text-center variant-gradient-primary-secondary">
		<div class="text-7xl mb-4">👻</div>
		<h1 class="h1 text-white">Ghostpost Reveal</h1>
		<p class="text-xl text-white/90 max-w-2xl mx-auto">
			Discover hidden messages on any website with one click. Zero configuration. Works everywhere.
		</p>
	</div>

	<!-- Installation Method Selection -->
	{#if !installMethod}
		<div class="card p-8 space-y-6">
			<h2 class="h2 text-center">Choose Your Installation Method</h2>
			<p class="text-center text-lg">Select the best option for your browser and needs</p>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
				<!-- Browser Extension Option (Recommended) -->
				<div class="card p-6 variant-ghost-primary space-y-4 border-2 border-primary-500">
					<div class="flex justify-between items-start">
						<h3 class="h3">Browser Extension</h3>
						<span class="badge variant-filled-success">Recommended</span>
					</div>

					<div class="text-4xl text-center">🚀</div>

					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Zero friction</strong> - No additional software needed</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>One-click download</strong> - Get the packaged extension immediately</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Auto-updates</strong> - Always current</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Works in incognito</strong> - Full privacy mode support</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Native integration</strong> - Seamless browser experience</span>
						</li>
					</ul>

					<button class="btn variant-filled-primary w-full" on:click={installExtension}>
						<span class="text-xl">⚡</span>
						<span>Install Extension</span>
					</button>

					<p class="text-xs text-center opacity-70">
						{#if browserType === 'chrome'}
							For Google Chrome
						{:else if browserType === 'firefox'}
							For Mozilla Firefox
						{:else if browserType === 'edge'}
							For Microsoft Edge
						{:else if browserType === 'safari'}
							For Safari
						{:else}
							Works with most modern browsers
						{/if}
					</p>
				</div>

				<!-- Userscript Option -->
				<div class="card p-6 variant-ghost-surface space-y-4">
					<h3 class="h3">Userscript</h3>

					<div class="text-4xl text-center">📜</div>

					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<span class="text-warning-500">⚠</span>
							<span><strong>Requires Tampermonkey</strong> - Extra step needed</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Auto-updates</strong> - Stays current</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Lightweight</strong> - Minimal resource use</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-success-500">✓</span>
							<span><strong>Cross-browser</strong> - Works everywhere</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="text-warning-500">⚠</span>
							<span><strong>Manual setup</strong> - Need to configure userscript manager</span>
						</li>
					</ul>

					<button
						class="btn variant-filled-surface w-full"
						on:click={() => (installMethod = 'userscript')}
					>
						<span>📋</span>
						<span>Choose Userscript</span>
					</button>

					<p class="text-xs text-center opacity-70">Alternative installation method</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Browser Extension Installation Instructions -->
	{#if installMethod === 'extension'}
		<div class="card p-8 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="h2">Browser Extension Installation</h2>
				<button class="btn btn-sm variant-ghost-surface" on:click={() => (installMethod = null)}>
					← Back
				</button>
			</div>

			<!-- For Chrome/Edge -->
			{#if browserType === 'chrome' || browserType === 'edge' || browserType === 'other'}
				<div class="space-y-4">
					<div class="card p-6 variant-ghost-primary">
						<h3 class="h3 mb-4">📦 Chrome/Edge Installation Steps</h3>
						<ol class="list-decimal list-inside space-y-3 text-sm">
							<li class="font-bold">Download the extension package:</li>
							<div class="ml-6 mt-2">
								<a
									href="/ghostpost-reveal-extension.zip"
									class="btn variant-filled-primary"
									download
								>
									<span>⬇️</span>
									<span>Download Extension</span>
								</a>
								<p class="text-xs mt-2 opacity-70">
									Extract the ZIP and select the extracted folder
								</p>
							</div>

							<li class="font-bold mt-4">Open your browser's extension page:</li>
							<div class="ml-6 mt-2 space-y-2">
								<p class="text-xs opacity-80">
									{#if browserType === 'edge'}
										Type <code class="code">edge://extensions</code> in your address bar
									{:else}
										Type <code class="code">chrome://extensions</code> in your address bar
									{/if}
								</p>
							</div>

							<li class="font-bold mt-4">Enable "Developer mode" (toggle in top-right corner)</li>

							<li class="font-bold">Click "Load unpacked" button</li>

							<li class="font-bold">
								Select the extracted `ghostpost-reveal-extension` folder
							</li>

							<li class="font-bold">The 👻 button will now appear on every website!</li>
						</ol>

						<div class="card p-4 variant-ghost-success mt-6">
							<p class="text-sm">
								<strong>✅ Optional:</strong> To use in incognito/private mode:
								<br />
								<span class="text-xs opacity-80"
									>Click "Details" on the extension → Enable "Allow in Incognito"</span
								>
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- For Firefox -->
			{#if browserType === 'firefox'}
				<div class="space-y-4">
					<div class="card p-6 variant-ghost-primary">
						<h3 class="h3 mb-4">🦊 Firefox Installation Steps</h3>
						<ol class="list-decimal list-inside space-y-3 text-sm">
							<li class="font-bold">Download the extension:</li>
							<div class="ml-6 mt-2">
								<a
									href="/ghostpost-reveal-extension.zip"
									class="btn variant-filled-primary"
									download
								>
									<span>⬇️</span>
									<span>Download Extension</span>
								</a>
								<p class="text-xs mt-2 opacity-70">
									Extract the ZIP and open the extracted folder
								</p>
							</div>

							<li class="font-bold mt-4">
								Open Firefox and navigate to <code class="code"
									>about:debugging#/runtime/this-firefox</code
								>
							</li>

							<li class="font-bold">Click "Load Temporary Add-on"</li>

							<li class="font-bold">
								Navigate to the browser-extension folder and select any file
							</li>

							<li class="font-bold">The 👻 button will now appear on every website!</li>
						</ol>

						<div class="card p-4 variant-ghost-warning mt-6">
							<p class="text-sm">
								<strong>⚠️ Note:</strong> Temporary add-ons are removed when Firefox restarts. For permanent
								installation, use the userscript method or wait for the official Firefox add-on release.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Verification -->
			<div class="card p-6 variant-ghost-success">
				<h3 class="h3 mb-4">✅ Verify Installation</h3>
				<p class="mb-4">After installing, you should see:</p>
				<ul class="list-disc list-inside space-y-2 text-sm ml-4">
					<li>The extension listed in your browser's extensions page</li>
					<li>Extension icon in your browser toolbar</li>
				</ul>

				<div class="mt-6 text-center">
					<a href="/demo" class="btn variant-filled-success">
						<span>🧪</span>
						<span>Test on Demo Page</span>
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Userscript Installation Instructions -->
	{#if installMethod === 'userscript'}
		<div class="card p-8 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="h2">Userscript Installation</h2>
				<button class="btn btn-sm variant-ghost-surface" on:click={() => (installMethod = null)}>
					← Back
				</button>
			</div>

			{#if !userscriptInstalled}
				<div class="space-y-4">
					<div class="card p-6 variant-ghost-warning">
						<h3 class="h3 text-sm mb-3">⚠️ Step 1: Install a Userscript Manager</h3>
						<p class="text-sm mb-4">
							You need a userscript manager extension installed first. We recommend Tampermonkey:
						</p>

						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<a
								href="https://www.tampermonkey.net/"
								target="_blank"
								class="btn variant-filled-primary"
							>
								<span>🐒</span>
								<span>Tampermonkey</span>
								<span class="badge variant-soft-success text-xs">Recommended</span>
							</a>
							<a
								href="https://violentmonkey.github.io/"
								target="_blank"
								class="btn variant-filled-surface"
							>
								<span>💜</span>
								<span>Violentmonkey</span>
							</a>
							<a
								href="https://www.greasespot.net/"
								target="_blank"
								class="btn variant-filled-surface"
							>
								<span>🔥</span>
								<span>Greasemonkey</span>
							</a>
						</div>

						<p class="text-xs mt-4 opacity-70 text-center">
							After installing a userscript manager, return to this page and proceed to Step 2.
						</p>
					</div>

					<div class="card p-6 variant-ghost-primary">
						<h3 class="h3 text-sm mb-3">✅ Step 2: Install Ghostpost Reveal Script</h3>
						<p class="text-sm mb-4">
							Once you have a userscript manager installed, click this button:
						</p>

						<button class="btn variant-filled-primary btn-xl w-full" on:click={installUserscript}>
							<span class="text-2xl">⚡</span>
							<span class="text-xl">Install Ghostpost Reveal</span>
						</button>

						<p class="text-xs mt-3 opacity-70 text-center">
							Your userscript manager will prompt you to install the script
						</p>
					</div>

					<!-- Configuration Tips -->
					<div class="card p-6 variant-ghost-surface">
						<h3 class="h3 text-sm mb-3">⚙️ Recommended Configuration</h3>
						<p class="text-sm mb-3">The userscript is pre-configured with optimal settings:</p>

						<ul class="list-disc list-inside space-y-2 text-sm ml-4">
							<li>
								<strong>Auto-update:</strong> Enabled by default (script updates automatically)
							</li>
							<li><strong>All websites:</strong> Runs on all pages automatically</li>
							<li><strong>Security:</strong> Sensitive domains (banking, login) are excluded</li>
						</ul>

						<div class="card p-4 variant-ghost-warning mt-4">
							<p class="text-xs">
								<strong>For incognito/private mode:</strong> You need to enable your userscript manager
								(Tampermonkey) to run in incognito mode from your browser's extension settings.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="card p-6 variant-ghost-success space-y-4">
					<h3 class="h3">✅ Installation Started!</h3>
					<p>
						Your userscript manager should have prompted you to install the Ghostpost Reveal script.
					</p>
					<p>If you approved it, the 👻 button will now appear on every website you visit!</p>

					<div class="text-center mt-6">
						<a href="/demo" class="btn variant-filled-success">
							<span>🧪</span>
							<span>Test on Demo Page</span>
						</a>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Features Section -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">✨ What You'll Get</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="space-y-2">
				<div class="text-4xl text-center">🔍</div>
				<h3 class="h3 text-center">Auto-Detect</h3>
				<p class="text-sm text-center">
					Automatically scans every webpage for hidden Ghostpost messages
				</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔢</div>
				<h3 class="h3 text-center">Live Counter</h3>
				<p class="text-sm text-center">
					Shows how many secrets are hidden on the page with a red badge
				</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">✨</div>
				<h3 class="h3 text-center">One-Click Reveal</h3>
				<p class="text-sm text-center">
					Click the floating 👻 button to instantly decode all messages
				</p>
			</div>
		</div>
	</div>

	<!-- Troubleshooting -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">❓ Troubleshooting</h2>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Button not appearing after installation?</summary>
			<p class="text-sm mt-2 ml-4">
				• Refresh the page (press F5 or Cmd+R)<br />
				• Check that your extension/userscript manager is enabled<br />
				• Verify the extension/script has permission to run on all websites<br />
				• Try opening a new tab
			</p>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Button shows but doesn't detect messages?</summary>
			<p class="text-sm mt-2 ml-4">
				The page might not contain any hidden Ghostpost messages. The counter only appears when
				hidden messages are detected. Try our <a href="/demo" class="anchor">demo page</a> to test!
			</p>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Need to uninstall?</summary>
			<p class="text-sm mt-2 ml-4">
				<strong>Extension:</strong> Go to your browser's extensions page and click "Remove"<br />
				<strong>Userscript:</strong> Open your userscript manager, find "Ghostpost Reveal", and delete
				it
			</p>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Which method should I choose?</summary>
			<p class="text-sm mt-2 ml-4">
				We recommend the <strong>browser extension</strong> for most users because it doesn't require
				any additional software. However, both methods provide the same functionality with automatic updates.
			</p>
		</details>
	</div>

	<!-- Back to Home -->
	<div class="text-center">
		<a href="/" class="btn variant-ghost-surface">
			<span>←</span>
			<span>Back to Home</span>
		</a>
	</div>
</div>

<style>
	.btn-xl {
		padding: 1.5rem 2rem;
		font-size: 1.25rem;
	}

	details {
		cursor: pointer;
		padding: 1rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.05);
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
