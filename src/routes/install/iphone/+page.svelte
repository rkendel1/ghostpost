<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let step = $state(1);
	let userscriptsInstalled = $state(false);
	let userscriptInstalled = $state(false);
	let extensionEnabled = $state(false);
	let siteUrl = $state('');

	// Check if user is on iOS
	let isIOS = $state(false);

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		isIOS = /iphone|ipad|ipod/.test(ua);

		// Get the site's base URL
		siteUrl = window.location.origin;
	});

	function installUserscriptsApp() {
		window.open('https://apps.apple.com/app/userscripts/id1463298887', '_blank');
		step = 2;
	}

	function installUserscript() {
		window.location.href = '/ghostpost-reveal.user.js';
		step = 3;
		// Note: User must manually confirm installation in Step 3
		// The timeout is removed - user will manually click to proceed to Step 4
	}
</script>

<svelte:head>
	<title>Install Ghostpost on iPhone - One-Click Setup</title>
	<meta
		name="description"
		content="Install Ghostpost Reveal on your iPhone in under 30 seconds. One-click installation with the Userscripts app."
	/>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-8">
	<!-- Hero Section -->
	<div class="card p-10 space-y-4 text-center variant-gradient-primary-secondary">
		<div class="text-7xl mb-4">📱👻</div>
		<h1 class="h1 text-white">Ghostpost for iPhone</h1>
		<p class="text-xl text-white/90 max-w-2xl mx-auto">
			One-click installation. Under 30 seconds total. Works on any website in Safari.
		</p>
	</div>

	<!-- Not iOS Warning -->
	{#if !isIOS && step === 1}
		<div class="card p-6 variant-ghost-warning space-y-4">
			<div class="flex items-center gap-3">
				<span class="text-3xl">⚠️</span>
				<div>
					<h3 class="h3 text-sm">Not on iPhone?</h3>
					<p class="text-xs opacity-80 mt-1">
						This installation guide is for iPhone users. For desktop browsers, use <a
							href="/install-easy"
							class="anchor">our desktop guide</a
						>.
					</p>
				</div>
			</div>
		</div>
	{/if}

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
			<span class="text-sm font-semibold">Get App</span>
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
			<span class="text-sm font-semibold">Enable Extension</span>
		</div>
		<div class="text-2xl opacity-30">→</div>
		<div class="flex items-center gap-2">
			<div
				class="badge {step >= 3
					? 'variant-filled-primary'
					: 'variant-soft-surface'} text-lg px-4 py-2"
			>
				{step >= 4 ? '✓' : '3'}
			</div>
			<span class="text-sm font-semibold">Install Script</span>
		</div>
		<div class="text-2xl opacity-30">→</div>
		<div class="flex items-center gap-2">
			<div
				class="badge {step >= 4
					? 'variant-filled-success'
					: 'variant-soft-surface'} text-lg px-4 py-2"
			>
				{step >= 4 ? '✓' : '🎉'}
			</div>
			<span class="text-sm font-semibold">Done!</span>
		</div>
	</div>

	<!-- Step 1: Install Userscripts App -->
	{#if step === 1}
		<div class="card p-8 space-y-6">
			<div class="text-center">
				<h2 class="h2 mb-4">Step 1: Install Userscripts App</h2>
				<p class="text-lg mb-6">
					This free app lets you run userscripts in Safari. One-time install (~10 seconds).
				</p>
			</div>

			<div class="card p-6 variant-ghost-primary space-y-4">
				<div class="text-center text-6xl">📲</div>
				<h3 class="h3 text-center">Userscripts App</h3>

				<ul class="space-y-2 text-sm">
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Free and lightweight</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Works with all websites in Safari</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Auto-updates userscripts</span>
					</li>
					<li class="flex items-center gap-2">
						<span class="text-success-500">✓</span>
						<span>Privacy-focused - runs locally</span>
					</li>
				</ul>

				<button class="btn variant-filled-primary w-full btn-xl" on:click={installUserscriptsApp}>
					<span class="text-2xl">🚀</span>
					<span class="text-xl">Get Userscripts App</span>
				</button>

				<p class="text-xs text-center opacity-70">Opens the App Store - tap "Get" to download</p>
			</div>

			<div class="card p-4 variant-ghost-surface text-center text-sm">
				<p class="mb-2">Already have Userscripts installed?</p>
				<button class="btn btn-sm variant-soft-primary" on:click={() => (step = 2)}>
					Skip to Step 2 →
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 2: Enable Safari Extension -->
	{#if step === 2}
		<div class="card p-8 space-y-6">
			<div class="text-center">
				<h2 class="h2 mb-4">Step 2: Enable in Safari Settings</h2>
				<p class="text-lg mb-6">Quick setup - takes about 15 seconds. Follow these steps:</p>
			</div>

			<div class="card p-6 variant-ghost-success space-y-5">
				<div class="text-center text-6xl">⚙️</div>
				<h3 class="h3 text-center text-sm">Enable Userscripts Extension</h3>

				<ol class="list-decimal list-inside space-y-3 text-sm ml-4">
					<li class="pl-2">
						<strong>Open Settings app</strong> on your iPhone
					</li>
					<li class="pl-2">
						<strong>Tap Safari</strong>
					</li>
					<li class="pl-2">
						<strong>Tap Extensions</strong>
					</li>
					<li class="pl-2">
						<strong>Tap Userscripts</strong> and turn it ON
					</li>
					<li class="pl-2">
						<strong>Tap "Allow"</strong> next to "All Websites"
					</li>
				</ol>

				<div class="card p-4 variant-ghost-warning text-xs">
					<p class="font-semibold mb-2">💡 Quick Tip:</p>
					<p>
						The Userscripts app should have auto-opened after install. If not, find it on your home
						screen.
					</p>
				</div>

				<div class="flex gap-3">
					<button class="btn variant-filled-success flex-1" on:click={() => (step = 3)}>
						<span>✓</span>
						<span>Extension Enabled!</span>
					</button>
				</div>
			</div>

			<div class="text-center">
				<button class="btn btn-sm variant-ghost-surface" on:click={() => (step = 1)}>
					← Back to Step 1
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3: Install Ghostpost Userscript -->
	{#if step === 3}
		<div class="card p-8 space-y-6">
			<div class="text-center">
				<h2 class="h2 mb-4">Step 3: Install Ghostpost Reveal</h2>
				<p class="text-lg mb-6">
					The magic step! One tap to install the script that reveals hidden messages.
				</p>
			</div>

			<div class="card p-6 variant-ghost-primary space-y-4">
				<div class="text-center text-6xl">👻</div>
				<h3 class="h3 text-center">One-Click Install</h3>

				<div class="space-y-3">
					<p class="text-sm font-semibold">What happens when you tap:</p>
					<ol class="list-decimal list-inside space-y-2 text-sm ml-4">
						<li>Userscripts will auto-detect the script file</li>
						<li>A popup will appear asking to install</li>
						<li>Tap "Install" - done!</li>
						<li>The 👻 button appears on all websites instantly</li>
					</ol>
				</div>

				<button class="btn variant-filled-primary w-full btn-xl" on:click={installUserscript}>
					<span class="text-2xl">✨</span>
					<span class="text-xl">Install Ghostpost Reveal</span>
				</button>

				<div class="card p-4 variant-ghost-success text-sm">
					<p class="font-semibold mb-2">✨ Auto-Configuration Included:</p>
					<ul class="list-disc list-inside space-y-1 ml-4 text-xs">
						<li>Auto-updates on new versions</li>
						<li>Works on all websites (Twitter, Reddit, Discord, etc.)</li>
						<li>Excludes banking/login pages for security</li>
						<li>All processing happens locally on your device</li>
					</ul>
				</div>
			</div>

			<div class="card p-4 variant-ghost-warning text-sm">
				<p class="font-semibold mb-2">⚠️ Important:</p>
				<p class="text-xs">
					Make sure you're viewing this page in <strong>Safari</strong> for the one-click install to work.
					If you're in another browser, copy this URL and open it in Safari.
				</p>
			</div>

			<!-- Verification -->
			<div class="card p-6 variant-ghost-success space-y-4">
				<h3 class="h3">✅ Verify Installation</h3>
				<p class="text-sm">Did you tap "Install" in the Userscripts popup?</p>

				<div class="flex gap-4">
					<button class="btn variant-filled-success flex-1" on:click={() => (step = 4)}>
						<span>✓</span>
						<span>Yes, installed successfully!</span>
					</button>
					<button class="btn variant-soft-surface flex-1" on:click={installUserscript}>
						<span>↺</span>
						<span>Try again</span>
					</button>
				</div>
			</div>

			<div class="text-center">
				<button class="btn btn-sm variant-ghost-surface" on:click={() => (step = 2)}>
					← Back to Step 2
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 4: Success -->
	{#if step >= 4}
		<div class="space-y-6">
			<div class="card p-8 variant-ghost-success space-y-6 text-center">
				<div class="text-8xl">🎉</div>
				<h2 class="h2">You're All Set!</h2>
				<p class="text-lg">
					Ghostpost Reveal is now active on your iPhone. Time to hunt some ghosts! 👻
				</p>

				<div class="card p-6 variant-soft-success space-y-4">
					<h3 class="h3 text-sm">What to expect:</h3>
					<ul class="text-left list-disc list-inside space-y-2 text-sm ml-4">
						<li>Open any website in Safari</li>
						<li>If hidden messages are found, you'll see a red badge on the 👻 button</li>
						<li>Tap the floating 👻 button (bottom-right corner)</li>
						<li>Reveal all hidden messages instantly!</li>
						<li>Auto-updates keep you current with new features</li>
					</ul>
				</div>

				<div class="card p-5 variant-ghost-primary space-y-3">
					<h3 class="h3 text-sm">✨ Pro Tips:</h3>
					<ul class="text-left space-y-2 text-xs ml-4">
						<li>• Works on X/Twitter, Reddit, Discord, Messages, and any website</li>
						<li>• The 👻 button only appears when you're browsing in Safari</li>
						<li>• To reload the page after install, tap the refresh button</li>
						<li>• All decoding happens locally - your privacy is protected</li>
					</ul>
				</div>

				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<a href="/demo" class="btn variant-filled-primary btn-lg">
						<span>🧪</span>
						<span>Try Demo Page</span>
					</a>
					<a href="/" class="btn variant-soft-surface btn-lg">
						<span>🏠</span>
						<span>Back to Home</span>
					</a>
				</div>
			</div>

			<!-- Share Section -->
			<div class="card p-6 space-y-4">
				<h3 class="h3">📤 Share with Friends</h3>
				<p class="text-sm opacity-80">
					Help your friends discover hidden messages too! Share this easy install link:
				</p>

				<div class="card p-4 variant-ghost-surface">
					<code class="text-xs break-all">
						{siteUrl}/install/iphone
					</code>
				</div>

				<p class="text-xs opacity-70 text-center">
					Or send them this message: "Ghostpost on iPhone: Tap
					<a href="https://apps.apple.com/app/userscripts/id1463298887" class="anchor">this</a>
					to install the free app, enable in Safari Settings → Extensions. Then tap
					<a href="{siteUrl}/ghostpost-reveal.user.js" class="anchor">this</a>
					to add the 👻 button. Boom—reveal secrets anywhere!"
				</p>
			</div>

			<!-- Troubleshooting Card -->
			<div class="card p-6 space-y-4">
				<h3 class="h3">❓ Troubleshooting</h3>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">👻 Button not appearing?</summary>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>1. Make sure you're using Safari (not Chrome or another browser)</p>
						<p>2. Check Settings → Safari → Extensions → Userscripts is ON</p>
						<p>3. Refresh the page (pull down to reload)</p>
						<p>4. Try our <a href="/demo" class="anchor">demo page</a> to test</p>
					</div>
				</details>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">Script not installing?</summary>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>1. Make sure you completed Step 2 (enabled extension in Settings)</p>
						<p>2. Open the Userscripts app and check if the script is there</p>
						<p>3. Try tapping the install button again</p>
						<p>
							4. If still having issues, visit the <a
								href="https://github.com/quoid/userscripts"
								class="anchor"
								target="_blank">Userscripts GitHub</a
							> for help
						</p>
					</div>
				</details>

				<details>
					<summary class="cursor-pointer font-semibold text-sm">Need to uninstall?</summary>
					<div class="mt-2 ml-4 text-sm space-y-2">
						<p>1. Open the Userscripts app</p>
						<p>2. Swipe left on "Ghostpost Reveal"</p>
						<p>3. Tap "Delete"</p>
						<p>Or turn off the extension in Settings → Safari → Extensions</p>
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
				<div class="text-4xl text-center">📱</div>
				<h3 class="h3 text-center text-sm">Mobile-Optimized</h3>
				<p class="text-xs text-center opacity-80">Designed specifically for iPhone and Safari</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔄</div>
				<h3 class="h3 text-center text-sm">Auto-Update</h3>
				<p class="text-xs text-center opacity-80">Always stays current with automatic updates</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🔒</div>
				<h3 class="h3 text-center text-sm">Privacy-First</h3>
				<p class="text-xs text-center opacity-80">All processing happens locally on your iPhone</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">⚡</div>
				<h3 class="h3 text-center text-sm">One-Tap Reveal</h3>
				<p class="text-xs text-center opacity-80">Instantly decode messages with a single tap</p>
			</div>

			<div class="space-y-2">
				<div class="text-4xl text-center">🌐</div>
				<h3 class="h3 text-center text-sm">Works Everywhere</h3>
				<p class="text-xs text-center opacity-80">Compatible with all websites in Safari</p>
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

	code {
		background: rgba(0, 0, 0, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-family: monospace;
		font-size: 0.875rem;
	}
</style>
