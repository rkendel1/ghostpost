<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let sharedText = '';
	let canShare = false;
	let copySuccess = false;

	onMount(() => {
		// Check if Web Share API is available
		canShare = !!navigator.share;
	});

	async function handleRevealFromShare() {
		if (!sharedText.trim()) {
			alert('Please paste the text you want to decode');
			return;
		}

		// Navigate to decode page with the text
		const encodedText = encodeURIComponent(sharedText);
		goto(`/decode?text=${encodedText}`);
	}

	async function handleNativeShare() {
		try {
			await navigator.share({
				title: 'Decode with Ghostpost',
				text: 'Use Ghostpost to reveal hidden messages',
				url: window.location.origin + '/decode'
			});
		} catch (err) {
			console.error('Share failed:', err);
		}
	}

	async function handleCopy() {
		const shareUrl = window.location.origin + '/decode';
		try {
			await navigator.clipboard.writeText(shareUrl);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch (err) {
			// Fallback: create temporary input for older browsers
			const input = document.createElement('input');
			input.value = shareUrl;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		}
	}
</script>

<svelte:head>
	<title>Share with Ghostpost - Mobile Decoder</title>
	<meta
		name="description"
		content="Quickly decode hidden messages on mobile using the share sheet"
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
</svelte:head>

<div class="container mx-auto p-6 max-w-2xl space-y-6">
	<!-- Hero Section -->
	<div class="card p-6 space-y-4 text-center variant-ghost-primary">
		<h1 class="h1 text-4xl">
			<span class="text-5xl">📱</span>
			<br />
			Mobile Share Decoder
		</h1>
		<p class="text-lg">Reveal hidden messages on mobile with one tap</p>
	</div>

	<!-- Share Input -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">🔍 Paste & Reveal</h2>
		<p class="text-sm opacity-75">
			Paste any text that might contain hidden messages, then tap Reveal to decode it.
		</p>

		<label class="label">
			<span>Paste Text Here</span>
			<textarea
				class="textarea"
				rows="6"
				bind:value={sharedText}
				placeholder="Long-press and paste text from your messenger, social media, or any app..."
			/>
		</label>

		<button
			class="btn variant-filled-primary w-full text-lg py-4"
			on:click={handleRevealFromShare}
			disabled={!sharedText.trim()}
		>
			<span>🔓</span>
			<span>Reveal Secret</span>
		</button>
	</div>

	<!-- Mobile Share Instructions -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">📲 How to Use Mobile Share</h2>

		<div class="space-y-4">
			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">📱 iOS (iPhone/iPad)</h3>
				<ol class="list-decimal list-inside space-y-2 text-sm">
					<li>Long-press on text in any app (Messages, Twitter, etc.)</li>
					<li>Tap "Copy" or "Select All" then "Copy"</li>
					<li>Open this page (bookmark it for quick access!)</li>
					<li>Long-press in the text box above and tap "Paste"</li>
					<li>Tap "Reveal Secret" to decode</li>
				</ol>
			</div>

			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">🤖 Android</h3>
				<ol class="list-decimal list-inside space-y-2 text-sm">
					<li>Long-press on text in any app</li>
					<li>Tap "Copy" or "Select All" then "Copy"</li>
					<li>Open this page (add to home screen for quick access!)</li>
					<li>Long-press in the text box above and tap "Paste"</li>
					<li>Tap "Reveal Secret" to decode</li>
				</ol>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">⚡ Quick Actions</h2>

		{#if canShare}
			<button class="btn variant-filled-secondary w-full" on:click={handleNativeShare}>
				<span>📤</span>
				<span>Share This Page</span>
			</button>
		{/if}

		<button
			class="btn variant-filled-tertiary w-full"
			on:click={handleCopy}
			disabled={copySuccess}
		>
			{#if copySuccess}
				<span>✓</span>
				<span>Copied!</span>
			{:else}
				<span>📋</span>
				<span>Copy Page Link</span>
			{/if}
		</button>

		<a href="/decode" class="btn variant-ghost-surface w-full">
			<span>🖥️</span>
			<span>Use Full Decoder</span>
		</a>
	</div>

	<!-- Add to Home Screen -->
	<div class="card p-6 space-y-4 variant-ghost-success">
		<h2 class="h2">💡 Pro Tip</h2>
		<p class="text-sm">
			Add this page to your home screen for instant access! It's like having a native app without
			the download.
		</p>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer text-sm">📱 iOS: Add to Home Screen</summary>
			<ol class="list-decimal list-inside space-y-1 text-xs mt-2 ml-4 opacity-75">
				<li>Tap the Share button (square with arrow)</li>
				<li>Scroll down and tap "Add to Home Screen"</li>
				<li>Tap "Add" to confirm</li>
				<li>The Ghostpost icon will appear on your home screen</li>
			</ol>
		</details>

		<details class="space-y-2">
			<summary class="font-bold cursor-pointer text-sm">🤖 Android: Add to Home Screen</summary>
			<ol class="list-decimal list-inside space-y-1 text-xs mt-2 ml-4 opacity-75">
				<li>Tap the menu button (three dots)</li>
				<li>Tap "Add to Home screen"</li>
				<li>Tap "Add" to confirm</li>
				<li>The Ghostpost icon will appear on your home screen</li>
			</ol>
		</details>
	</div>

	<!-- About -->
	<div class="card p-6 space-y-2">
		<h3 class="h3 text-base">🎭 About Hidden Messages</h3>
		<p class="text-sm opacity-75">
			Ghostpost uses invisible Unicode characters to hide secret messages within normal text.
			These characters are invisible but can be decoded to reveal the hidden content. Perfect for
			private communication in public spaces!
		</p>
		<a href="/" class="anchor text-sm">Learn more →</a>
	</div>

	<!-- Navigation -->
	<div class="flex gap-4">
		<a href="/" class="btn variant-ghost-surface flex-1">
			<span>🏠</span>
			<span>Home</span>
		</a>
		<a href="/compose" class="btn variant-ghost-surface flex-1">
			<span>✍️</span>
			<span>Compose</span>
		</a>
	</div>
</div>

<style>
	details {
		cursor: pointer;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: rgba(0, 0, 0, 0.05);
	}

	details:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	details[open] {
		background: rgba(0, 0, 0, 0.1);
	}

	/* Optimize for mobile */
	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}
	}
</style>
