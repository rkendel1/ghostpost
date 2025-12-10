<script lang="ts">
	import { onMount } from 'svelte';
	import { decodeMessage, encodeMessage, initWasm } from '$lib/ghostpost';

	// Demo state
	let demoStep = 'idle'; // idle, encoding, encoded, decoding, decoded
	let demoVisibleMessage = 'Hey everyone! Just wanted to share some exciting news! 🎉';
	let demoSecretMessage = 'The secret is: GhostPost is amazing!';
	let demoEncodedMessage = '';
	let demoDecodedSecret = '';
	let isProcessing = false;

	onMount(async () => {
		await initWasm();
	});

	async function runDemo() {
		isProcessing = true;
		demoStep = 'encoding';

		// Simulate encoding
		await new Promise((resolve) => setTimeout(resolve, 800));

		try {
			const result = await encodeMessage(demoVisibleMessage, demoSecretMessage);
			demoEncodedMessage = result.encoded;
			demoStep = 'encoded';

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Decode
			demoStep = 'decoding';
			await new Promise((resolve) => setTimeout(resolve, 800));

			const decodeResult = await decodeMessage(demoEncodedMessage);
			demoDecodedSecret = decodeResult.message;
			demoStep = 'decoded';
		} catch (err) {
			console.error('Demo error:', err);
			demoStep = 'idle';
		} finally {
			isProcessing = false;
		}
	}

	function resetDemo() {
		demoStep = 'idle';
		demoEncodedMessage = '';
		demoDecodedSecret = '';
	}

	// Features data
	const features = [
		{
			icon: '🔒',
			title: 'Invisible Encoding',
			description:
				'Hide text or images within any message using invisible Unicode characters that are imperceptible to the human eye'
		},
		{
			icon: '🤖',
			title: 'AI-Powered',
			description:
				'Generate platform-optimized content with AI, then seamlessly embed your secret message'
		},
		{
			icon: '📊',
			title: 'Analytics Tracking',
			description:
				'Track who decodes your messages with detailed analytics (when signed in) - see views, platforms, and geographic data'
		},
		{
			icon: '🌐',
			title: 'Universal Sharing',
			description:
				'Share on any platform - Twitter, LinkedIn, Discord, Messages, or anywhere that supports text'
		},
		{
			icon: '🔓',
			title: 'Easy Decoding',
			description:
				'Recipients can decode with our web app, browser extension, or mobile-friendly interface'
		},
		{
			icon: '🚀',
			title: 'No Sign-Up Required',
			description:
				'Start encoding and decoding immediately. Optional account for saving posts and analytics'
		}
	];

	// Use cases
	const useCases = [
		{
			emoji: '💼',
			title: 'Business',
			description: 'Share public announcements with hidden details for stakeholders'
		},
		{
			emoji: '🎮',
			title: 'Gaming',
			description: 'Hide Easter eggs and secret messages in your game posts'
		},
		{
			emoji: '💬',
			title: 'Social',
			description: 'Share dual-layer messages on social media for different audiences'
		},
		{
			emoji: '🎓',
			title: 'Education',
			description: 'Create interactive learning content with hidden answers'
		}
	];
</script>

<svelte:head>
	<title>GhostPost - Hide Secrets in Messages</title>
	<meta
		name="description"
		content="Hide secret messages within any text using invisible Unicode characters. Share publicly, reveal selectively."
	/>
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Section -->
	<section class="container mx-auto px-4 py-16 lg:py-24">
		<div class="max-w-5xl mx-auto text-center space-y-8">
			<!-- Logo/Icon -->
			<div class="flex justify-center">
				<div
					class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-6xl md:text-7xl animate-pulse"
				>
					👻
				</div>
			</div>

			<!-- Headline -->
			<div class="space-y-4">
				<h1 class="h1 text-4xl md:text-6xl lg:text-7xl font-bold">
					Welcome to <span class="text-gradient">GhostPost</span>
				</h1>
				<p class="text-xl md:text-2xl opacity-75 max-w-3xl mx-auto">
					Hide secret messages within any text. Share publicly, reveal selectively.
				</p>
			</div>

			<!-- CTA Buttons -->
			<div class="flex flex-wrap justify-center gap-4 pt-4">
				<a href="/compose" class="btn variant-filled-primary btn-lg text-lg">
					<span>✨</span>
					<span>Create GhostPost</span>
				</a>
				<a href="/decode" class="btn variant-ghost-surface btn-lg text-lg">
					<span>🔍</span>
					<span>Decode Message</span>
				</a>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-8">
				<div class="card p-4 variant-ghost-primary">
					<div class="h2 text-2xl md:text-3xl">100%</div>
					<div class="text-xs md:text-sm opacity-75">Invisible</div>
				</div>
				<div class="card p-4 variant-ghost-secondary">
					<div class="h2 text-2xl md:text-3xl">∞</div>
					<div class="text-xs md:text-sm opacity-75">Platforms</div>
				</div>
				<div class="card p-4 variant-ghost-tertiary">
					<div class="h2 text-2xl md:text-3xl">Free</div>
					<div class="text-xs md:text-sm opacity-75">No Limits</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Reveal Button Installation CTA - Prominent Section -->
	<section class="bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 py-12">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<div class="card p-8 bg-surface-50-900-token space-y-6 text-center">
					<div class="space-y-3">
						<div class="flex justify-center">
							<span class="text-6xl md:text-7xl">👻</span>
						</div>
						<h2 class="h2 text-2xl md:text-4xl font-bold">
							Discover Hidden Messages Everywhere!
						</h2>
						<p class="text-lg md:text-xl opacity-90">
							Install the Reveal Button to automatically detect and decode GhostPost messages on any
							website
						</p>
						<p class="text-sm md:text-base opacity-75">
							✨ No sign-up required • Works on all websites • One-click reveal
						</p>
					</div>

					<div class="flex flex-wrap justify-center gap-4 pt-4">
						<a
							href="/install"
							class="btn variant-filled-primary btn-xl font-bold hover:scale-105 transition-transform"
						>
							<span>⚡</span>
							<span>Install Reveal Button</span>
						</a>
						<a
							href="/demo"
							class="btn variant-ghost-surface btn-xl hover:scale-105 transition-transform"
						>
							<span>🧪</span>
							<span>Try Demo</span>
						</a>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
						<div class="space-y-2">
							<div class="text-3xl">🔍</div>
							<h3 class="h4 text-base font-semibold">Auto-Detect</h3>
							<p class="text-sm opacity-75">Scans every page for hidden messages</p>
						</div>
						<div class="space-y-2">
							<div class="text-3xl">🔔</div>
							<h3 class="h4 text-base font-semibold">Live Counter</h3>
							<p class="text-sm opacity-75">Shows how many secrets are found</p>
						</div>
						<div class="space-y-2">
							<div class="text-3xl">⚡</div>
							<h3 class="h4 text-base font-semibold">Instant Reveal</h3>
							<p class="text-sm opacity-75">One click to decode all messages</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Interactive Demo Section -->
	<section class="bg-surface-900/30 py-16">
		<div class="container mx-auto px-4 max-w-4xl">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl mb-4">See It In Action</h2>
				<p class="text-lg opacity-75">Watch how GhostPost hides secrets in plain sight</p>
			</div>

			<div class="card p-8 space-y-6">
				<!-- Demo Controls -->
				{#if demoStep === 'idle'}
					<div class="text-center space-y-4">
						<div class="space-y-2">
							<h3 class="h3">Demo Message</h3>
							<div class="card p-4 variant-ghost-surface">
								<p class="text-sm">
									<strong>Visible:</strong>
									{demoVisibleMessage}
								</p>
								<p class="text-sm mt-2">
									<strong>Secret:</strong>
									{demoSecretMessage}
								</p>
							</div>
						</div>
						<button
							class="btn variant-filled-primary btn-lg"
							on:click={runDemo}
							disabled={isProcessing}
						>
							<span>🎬</span>
							<span>Run Demo</span>
						</button>
					</div>
				{/if}

				<!-- Encoding Animation -->
				{#if demoStep === 'encoding'}
					<div class="text-center space-y-4">
						<div class="flex justify-center">
							<div class="w-16 h-16 animate-spin">
								<span class="text-5xl">🔒</span>
							</div>
						</div>
						<h3 class="h3">Encoding secret...</h3>
						<p class="text-sm opacity-75">Adding invisible Unicode characters</p>
					</div>
				{/if}

				<!-- Encoded Result -->
				{#if demoStep === 'encoded'}
					<div class="text-center space-y-4">
						<div class="flex justify-center">
							<span class="text-5xl">✅</span>
						</div>
						<h3 class="h3">Message Encoded!</h3>
						<div class="card p-4 variant-ghost-success">
							<p class="text-sm mb-2 opacity-75">This message looks normal but contains a secret:</p>
							<p class="text-base break-all">{demoEncodedMessage}</p>
						</div>
						<p class="text-sm opacity-75">
							Can you see the difference? Neither can anyone else! 👀
						</p>
					</div>
				{/if}

				<!-- Decoding Animation -->
				{#if demoStep === 'decoding'}
					<div class="text-center space-y-4">
						<div class="flex justify-center">
							<div class="w-16 h-16 animate-bounce">
								<span class="text-5xl">🔓</span>
							</div>
						</div>
						<h3 class="h3">Decoding secret...</h3>
						<p class="text-sm opacity-75">Extracting hidden message</p>
					</div>
				{/if}

				<!-- Decoded Result -->
				{#if demoStep === 'decoded'}
					<div class="text-center space-y-4">
						<div class="flex justify-center">
							<span class="text-5xl">🎉</span>
						</div>
						<h3 class="h3">Secret Revealed!</h3>
						<div class="card p-6 variant-glass-primary">
							<p class="text-xl font-bold">{demoDecodedSecret}</p>
						</div>
						<button class="btn variant-filled-secondary" on:click={resetDemo}>
							<span>🔄</span>
							<span>Run Again</span>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="container mx-auto px-4 py-16">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl mb-4">Powerful Features</h2>
				<p class="text-lg opacity-75">Everything you need to share secrets securely</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each features as feature}
					<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
						<div class="text-4xl">{feature.icon}</div>
						<h3 class="h3 text-lg">{feature.title}</h3>
						<p class="text-sm opacity-75">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Use Cases Section -->
	<section class="bg-surface-900/30 py-16">
		<div class="container mx-auto px-4 max-w-6xl">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl mb-4">Perfect For</h2>
				<p class="text-lg opacity-75">Endless possibilities for hidden messaging</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each useCases as useCase}
					<div class="card p-6 text-center space-y-3 variant-ghost-primary">
						<div class="text-5xl">{useCase.emoji}</div>
						<h3 class="h3 text-lg">{useCase.title}</h3>
						<p class="text-sm opacity-75">{useCase.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="container mx-auto px-4 py-16">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl mb-4">How It Works</h2>
				<p class="text-lg opacity-75">Simple, secure, and invisible</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-primary-500 flex items-center justify-center text-3xl"
					>
						1️⃣
					</div>
					<h3 class="h3">Write Your Message</h3>
					<p class="text-sm opacity-75">
						Compose your public message and add a secret that only certain people should see
					</p>
				</div>

				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-secondary-500 flex items-center justify-center text-3xl"
					>
						2️⃣
					</div>
					<h3 class="h3">Encode & Share</h3>
					<p class="text-sm opacity-75">
						Our tool hides your secret using invisible Unicode. Post anywhere - Twitter, Discord,
						anywhere!
					</p>
				</div>

				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-tertiary-500 flex items-center justify-center text-3xl"
					>
						3️⃣
					</div>
					<h3 class="h3">Recipients Decode</h3>
					<p class="text-sm opacity-75">
						Share the decode link with those who should see the secret. Others see just the public
						message!
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="bg-gradient-to-br from-primary-500 to-secondary-500 py-16">
		<div class="container mx-auto px-4 text-center">
			<div class="max-w-3xl mx-auto space-y-8">
				<h2 class="h2 text-3xl md:text-5xl font-bold text-white">
					Ready to Start Hiding Secrets?
				</h2>
				<p class="text-xl text-white/90">
					Join thousands using GhostPost for secure, invisible messaging
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a
						href="/compose"
						class="btn variant-filled bg-white text-primary-500 btn-lg hover:scale-105"
					>
						<span>✨</span>
						<span>Create Your First GhostPost</span>
					</a>
					<a href="/decode" class="btn variant-ringed ring-white text-white btn-lg hover:scale-105">
						<span>🔍</span>
						<span>Decode a Message</span>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer Info -->
	<section class="container mx-auto px-4 py-12">
		<div class="max-w-4xl mx-auto">
			<div class="card p-6 variant-ghost-surface">
				<div class="text-center space-y-4">
					<h3 class="h3">💡 Privacy First</h3>
					<p class="text-sm opacity-75">
						All encoding and decoding happens in your browser. We don't see your secrets. Optional
						analytics (when signed in) track decode events anonymously without collecting personal
						information.
					</p>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.text-gradient {
		background: linear-gradient(45deg, var(--color-primary-500), var(--color-secondary-500));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.btn-xl {
		padding: 1rem 2rem;
	}

	@media (min-width: 768px) {
		.btn-xl {
			padding: 1.25rem 2.5rem;
			font-size: 1.25rem;
		}
	}
</style>
