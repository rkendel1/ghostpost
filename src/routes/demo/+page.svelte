<script lang="ts">
	import { onMount } from 'svelte';
	import { initWasm, encodeMessage } from '$lib/ghostpost';

	let installed = false;

	// Sample messages that will be encoded at runtime for proper WASM encoding
	const demoMessageTemplates = [
		{
			title: 'Social Media Post',
			visible:
				'Just had an amazing day exploring the city! 🌆 #blessed #citylife #adventures #exploring',
			secret: 'Meeting at 8pm at the usual spot'
		},
		{
			title: 'Business Message',
			visible: 'The quarterly report looks promising. Looking forward to the board meeting.',
			secret: 'Deal postponed - standby for updates'
		},
		{
			title: 'Casual Chat',
			visible: 'Hey! Hope you are having a great day! Let us catch up soon',
			secret: 'Code: Alpha-7-Bravo'
		}
	];

	let demoMessages: Array<{
		title: string;
		visible: string;
		encoded: string;
		secret: string;
	}> = [];

	onMount(async () => {
		// Initialize WASM
		try {
			await initWasm();

			// Give WASM a moment to fully initialize
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Generate properly encoded messages at runtime
			demoMessages = await Promise.all(
				demoMessageTemplates.map(async (template) => {
					try {
						const result = await encodeMessage(template.visible, template.secret, false);
						return {
							title: template.title,
							visible: template.visible,
							encoded: result.encoded,
							secret: template.secret
						};
					} catch (err) {
						console.error('Failed to encode demo message:', err);
						// Return a fallback with unencoded message
						return {
							title: template.title,
							visible: template.visible,
							encoded: template.visible, // Fallback to visible message
							secret: template.secret
						};
					}
				})
			);
		} catch (err) {
			console.error('Failed to initialize WASM:', err);
		}

		// Check if userscript might be installed by looking for the button
		setTimeout(() => {
			const button = document.getElementById('ghostpost-reveal-button');
			installed = !!button;
		}, 1000);
	});
</script>

<svelte:head>
	<title>Demo - Try Ghostpost Reveal Button</title>
	<meta name="description" content="Test the Ghostpost Reveal button with sample hidden messages" />
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-6">
	<!-- Hero -->
	<div class="card p-8 space-y-4 text-center variant-ghost-primary">
		<h1 class="h1">
			<span class="text-6xl">🧪</span>
			<br />
			Demo Page
		</h1>
		<p class="text-xl">Test the Ghostpost Reveal button with sample hidden messages</p>
	</div>

	<!-- Installation Status -->
	{#if !installed}
		<div class="card p-6 variant-ghost-warning space-y-4">
			<h2 class="h2 text-lg">⚠️ Overlay Button Not Detected</h2>
			<p>
				It looks like you haven't installed the Ghostpost Reveal button yet. Install it to see the
				magic happen on this page!
			</p>
			<a href="/install" class="btn variant-filled-primary">
				<span>⚡</span>
				<span>Install Reveal Button</span>
			</a>
		</div>
	{:else}
		<div class="card p-6 variant-ghost-success space-y-4">
			<h2 class="h2 text-lg">✅ Overlay Button Detected!</h2>
			<p>
				Great! The 👻 button should be visible in the bottom-right corner. It should show a red
				counter badge indicating <strong>{demoMessages.length} hidden messages</strong> on this page.
			</p>
			<p class="text-sm opacity-75">Click the 👻 button to reveal all hidden secrets!</p>
		</div>
	{/if}

	<!-- Instructions -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">📋 How to Test</h2>
		<ol class="list-decimal list-inside space-y-2">
			<li>
				Look for the floating <span class="text-2xl">👻</span> button in the bottom-right corner
			</li>
			<li>Notice the red badge showing the count of hidden messages ({demoMessages.length})</li>
			<li>Click the button to open the Hidden Messages modal</li>
			<li>
				In the modal, click "Reveal" on any message to decode it inline - no page navigation
				required!
			</li>
			<li>Use the "Find" button to locate messages on the page</li>
		</ol>
	</div>

	<!-- Sample Messages -->
	<div class="space-y-4">
		<h2 class="h2">📝 Sample Messages with Hidden Secrets</h2>
		<p class="text-sm opacity-75">
			These messages look normal but contain hidden content. The overlay button will detect them
			automatically!
		</p>

		{#if demoMessages.length === 0}
			<div class="card p-6">
				<p class="text-center opacity-75">Loading demo messages...</p>
			</div>
		{/if}

		{#each demoMessages as message}
			<div class="card p-6 space-y-3">
				<h3 class="h3 text-lg">{message.title}</h3>

				<div class="card p-4 variant-ghost-surface">
					<p class="text-sm font-mono">{message.encoded}</p>
				</div>

				<details class="text-sm">
					<summary class="font-bold cursor-pointer opacity-75">
						🔍 What's hidden here? (spoiler)
					</summary>
					<p class="mt-2 ml-4 opacity-75 italic">Secret: "{message.secret}"</p>
				</details>
			</div>
		{/each}
	</div>

	<!-- Features Demo -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">✨ What You'll See</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">🔴 Pulsing Animation</h3>
				<p class="text-sm">The button pulses red when hidden messages are detected</p>
			</div>

			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">🔢 Counter Badge</h3>
				<p class="text-sm">Red badge shows the exact count of hidden messages</p>
			</div>

			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">⚡ Inline Reveal</h3>
				<p class="text-sm">Decode secrets directly in the modal without leaving the page</p>
			</div>

			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 text-base mb-2">📱 Works Everywhere</h3>
				<p class="text-sm">Try it on Twitter, Reddit, or any website!</p>
			</div>
		</div>
	</div>

	<!-- Try Creating Your Own -->
	<div class="card p-6 space-y-4 variant-ghost-primary">
		<h2 class="h2">✍️ Create Your Own Hidden Messages</h2>
		<p>Want to create your own messages with hidden secrets?</p>
		<div class="flex gap-4 flex-wrap">
			<a href="/compose" class="btn variant-filled-primary">
				<span>✨</span>
				<span>AI Composer</span>
			</a>
			<a href="/" class="btn variant-filled-secondary">
				<span>🔧</span>
				<span>Classic Tool</span>
			</a>
		</div>
	</div>

	<!-- Testing on Other Sites -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">🌐 Test on Other Websites</h2>
		<p class="text-sm">
			The overlay button works on ANY website. Try posting one of the messages above to:
		</p>
		<ul class="list-disc list-inside space-y-1 text-sm">
			<li>Twitter/X - Post as a tweet</li>
			<li>Reddit - Post as a comment</li>
			<li>Discord - Send in a channel</li>
			<li>Instagram - Use in captions</li>
			<li>Facebook - Share as a post</li>
		</ul>
		<p class="text-sm opacity-75">
			The 👻 button will automatically appear and detect the hidden message on those sites too!
		</p>
	</div>

	<!-- Additional Resources -->
	<div class="card p-6 space-y-4">
		<h2 class="h2">📚 Resources</h2>
		<div class="flex gap-4 flex-wrap">
			<a href="/install" class="btn variant-ghost-surface">
				<span>⚙️</span>
				<span>Installation Guide</span>
			</a>
			<a href="/decode" class="btn variant-ghost-surface">
				<span>🔍</span>
				<span>Manual Decoder</span>
			</a>
			<a href="/share" class="btn variant-ghost-surface">
				<span>📱</span>
				<span>Mobile Share</span>
			</a>
		</div>
	</div>

	<!-- Back -->
	<div class="text-center">
		<a href="/" class="btn variant-ghost-surface">
			<span>←</span>
			<span>Back to Home</span>
		</a>
	</div>
</div>

<style>
	details {
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 0.25rem;
		background: rgba(0, 0, 0, 0.05);
	}

	details:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	details[open] {
		background: rgba(0, 0, 0, 0.1);
	}
</style>
