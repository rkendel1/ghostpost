<script lang="ts">
	let installed = $state(false);
	let browserType = $state<'chrome' | 'firefox' | 'safari' | 'other'>('other');

	// Detect browser
	function detectBrowser() {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('chrome') && !ua.includes('edg')) {
			browserType = 'chrome';
		} else if (ua.includes('firefox')) {
			browserType = 'firefox';
		} else if (ua.includes('safari') && !ua.includes('chrome')) {
			browserType = 'safari';
		} else {
			browserType = 'other';
		}
	}

	function handleInstall() {
		window.location.href = '/ghostpost-reveal.user.js';
		installed = true;
	}

	$effect(() => {
		detectBrowser();
	});
</script>

<svelte:head>
	<title>Install Ghostpost Reveal Button</title>
	<meta
		name="description"
		content="Install the Ghostpost Reveal button to detect and decode hidden messages on any website with one click"
	/>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-6">
	<!-- Hero Section -->
	<div class="card p-8 space-y-4 text-center variant-ghost-primary">
		<h1 class="h1">
			<span class="text-6xl">👻</span>
			<br />
			Ghostpost Reveal Button
		</h1>
		<p class="text-xl">
			Discover hidden messages on any website with one click. Zero setup. Works everywhere.
		</p>
	</div>

	<!-- Installation Card -->
	<div class="card p-8 space-y-6">
		<h2 class="h2">🚀 Quick Install</h2>

		{#if !installed}
			<div class="space-y-4">
				<p class="text-lg">
					Click the button below to install the Ghostpost Reveal userscript. This will add a
					floating 👻 button to every website you visit.
				</p>

				<button class="btn variant-filled-primary btn-xl w-full" on:click={handleInstall}>
					<span class="text-2xl">⚡</span>
					<span class="text-xl">Install Reveal Button</span>
				</button>

				<div class="card p-4 variant-ghost-warning">
					<h3 class="h3 text-sm mb-2">⚠️ Userscript Manager Required</h3>
					<p class="text-sm">
						You need a userscript manager extension installed in your browser. If you don't have
						one, install it first:
					</p>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
						<a
							href="https://www.tampermonkey.net/"
							target="_blank"
							class="btn variant-filled-surface"
						>
							<span>🐒</span>
							<span>Tampermonkey</span>
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
				</div>
			</div>
		{:else}
			<div class="card p-6 variant-ghost-success space-y-4">
				<h3 class="h3">✅ Installation Started!</h3>
				<p>
					Your userscript manager should have prompted you to install the Ghostpost Reveal script.
				</p>
				<p>
					If you approved it, the 👻 button will now appear on every website you visit. Try it out
					on any page with hidden Ghostpost messages!
				</p>
			</div>
		{/if}
	</div>

	<!-- How It Works -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">🎯 How It Works</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<div class="space-y-2">
				<div class="text-4xl text-center">🔍</div>
				<h3 class="h3 text-center">Auto-Detect</h3>
				<p class="text-sm text-center">
					The button automatically scans every webpage for hidden Ghostpost messages
				</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔢</div>
				<h3 class="h3 text-center">Shows Counter</h3>
				<p class="text-sm text-center">
					When secrets are found, the button pulses red and shows how many messages are hidden
				</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">✨</div>
				<h3 class="h3 text-center">One-Click Reveal</h3>
				<p class="text-sm text-center">
					Click the button to instantly reveal all hidden messages on the page
				</p>
			</div>
		</div>
	</div>

	<!-- Features -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">✨ Features</h2>

		<ul class="list-disc list-inside space-y-2">
			<li>🌐 Works on ALL websites (Twitter, Reddit, Discord, Instagram, etc.)</li>
			<li>🎯 Automatic detection - no manual scanning needed</li>
			<li>⚡ One-click reveal - instant results</li>
			<li>🔒 100% Privacy - all processing happens in your browser</li>
			<li>🚀 Lightweight - only 5KB script size</li>
			<li>📱 Works on desktop browsers</li>
			<li>🔄 Auto-updates to stay current</li>
		</ul>
	</div>

	<!-- Browser-Specific Instructions -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">📱 Browser-Specific Setup</h2>

		{#if browserType === 'chrome'}
			<div class="card p-4 variant-ghost-primary">
				<h3 class="h3">Chrome Setup</h3>
				<ol class="list-decimal list-inside space-y-2 mt-2">
					<li>Install Tampermonkey from the Chrome Web Store</li>
					<li>Click the "Install Reveal Button" button above</li>
					<li>Approve the script installation in Tampermonkey</li>
					<li>Visit any webpage - you'll see the 👻 button in the bottom-right corner</li>
				</ol>
			</div>
		{:else if browserType === 'firefox'}
			<div class="card p-4 variant-ghost-primary">
				<h3 class="h3">Firefox Setup</h3>
				<ol class="list-decimal list-inside space-y-2 mt-2">
					<li>Install Tampermonkey or Greasemonkey from Firefox Add-ons</li>
					<li>Click the "Install Reveal Button" button above</li>
					<li>Approve the script installation</li>
					<li>Visit any webpage - you'll see the 👻 button in the bottom-right corner</li>
				</ol>
			</div>
		{:else if browserType === 'safari'}
			<div class="card p-4 variant-ghost-primary">
				<h3 class="h3">Safari Setup</h3>
				<ol class="list-decimal list-inside space-y-2 mt-2">
					<li>Install Userscripts Safari extension from the App Store</li>
					<li>Click the "Install Reveal Button" button above</li>
					<li>Approve the script installation</li>
					<li>Visit any webpage - you'll see the 👻 button in the bottom-right corner</li>
				</ol>
			</div>
		{:else}
			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3">General Setup</h3>
				<ol class="list-decimal list-inside space-y-2 mt-2">
					<li>Install a userscript manager (Tampermonkey, Violentmonkey, or Greasemonkey)</li>
					<li>Click the "Install Reveal Button" button above</li>
					<li>Approve the script installation in your userscript manager</li>
					<li>Visit any webpage - you'll see the 👻 button in the bottom-right corner</li>
				</ol>
			</div>
		{/if}
	</div>

	<!-- Try It Out -->
	<div class="card p-8 space-y-4 variant-ghost-success">
		<h2 class="h2">🧪 Try It Out!</h2>
		<p>After installation, test the button on our decode page with hidden messages:</p>
		<a href="/decode" class="btn variant-filled-primary">
			<span>🔍</span>
			<span>Go to Decode Page</span>
		</a>
	</div>

	<!-- Troubleshooting -->
	<div class="card p-8 space-y-4">
		<h2 class="h2">❓ Troubleshooting</h2>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Button not appearing after installation?</summary>
			<p class="text-sm mt-2 ml-4">
				Make sure your userscript manager is enabled and the Ghostpost Reveal script is active. Try
				refreshing the page. Check your browser's extensions page to ensure the userscript manager
				has permission to run on all websites.
			</p>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Button shows but doesn't detect messages?</summary>
			<p class="text-sm mt-2 ml-4">
				The page might not contain any hidden Ghostpost messages. Try visiting the decode page or a
				page where you know there's a hidden message. The counter only appears when hidden messages
				are detected.
			</p>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer">Need to uninstall?</summary>
			<p class="text-sm mt-2 ml-4">
				Open your userscript manager (click its icon in your browser toolbar), find "Ghostpost
				Reveal" in the list, and click the trash/delete icon or toggle it off.
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
</style>
