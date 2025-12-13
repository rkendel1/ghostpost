<script lang="ts">
	import { onMount } from 'svelte';
	import { decodeMessage, encodeMessage, initWasm } from '$lib/ghostpost';

	// Demo state
	let demoVisibleMessage = 'Just shipped our latest feature! 🚀';
	let demoSecretMessage = 'Beta access code: GHOST2024';
	let demoEncodedMessage = '';
	let demoDecodedSecret = '';
	let isEncoding = false;
	let isDecoding = false;
	let showEncoded = false;
	let showDecoded = false;
	let errorMessage = '';
	let installUrl = $state('/install');

	onMount(async () => {
		await initWasm();

		// Load the reveal button script to demonstrate overlay detection
		loadRevealScript();

		// Detect iOS and set appropriate install URL
		const ua = navigator.userAgent.toLowerCase();
		const isIOS = /iphone|ipad|ipod/.test(ua);
		installUrl = isIOS ? '/install/iphone' : '/install-easy';
	});

	function loadRevealScript() {
		// Check if script already loaded
		if (document.getElementById('ghostpost-reveal-script')) {
			return;
		}

		const script = document.createElement('script');
		script.id = 'ghostpost-reveal-script';
		script.src = '/ghostpost-reveal.user.js';
		script.async = true;
		document.body.appendChild(script);
	}

	async function handleEncode() {
		if (!demoVisibleMessage || !demoSecretMessage) return;

		isEncoding = true;
		showEncoded = false;
		showDecoded = false;
		demoDecodedSecret = '';
		errorMessage = '';

		try {
			await new Promise((resolve) => setTimeout(resolve, 500));
			const result = await encodeMessage(demoVisibleMessage, demoSecretMessage, false);
			demoEncodedMessage = result.encoded;
			showEncoded = true;
		} catch (err) {
			console.error('Encoding error:', err);
			errorMessage = 'Error encoding message. Please try again.';
		} finally {
			isEncoding = false;
		}
	}

	async function handleDecode() {
		if (!demoEncodedMessage) return;

		isDecoding = true;
		showDecoded = false;
		errorMessage = '';

		try {
			await new Promise((resolve) => setTimeout(resolve, 500));
			const result = await decodeMessage(demoEncodedMessage);
			demoDecodedSecret = result.message;
			showDecoded = true;
		} catch (err) {
			console.error('Decoding error:', err);
			errorMessage = 'Error decoding message. Please try again.';
		} finally {
			isDecoding = false;
		}
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(demoEncodedMessage);
			// Show success feedback
			const btn = document.activeElement;
			const originalText = btn?.textContent;
			if (btn) {
				btn.textContent = '✅ Copied!';
				setTimeout(() => {
					if (btn) btn.textContent = originalText;
				}, 2000);
			}
		} catch (err) {
			console.error('Copy failed:', err);
			errorMessage = 'Failed to copy to clipboard. Please copy manually.';
		}
	}

	function resetDemo() {
		demoEncodedMessage = '';
		demoDecodedSecret = '';
		showEncoded = false;
		showDecoded = false;
	}
</script>

<svelte:head>
	<title>GhostPost - Hide Secret Messages in Plain Sight</title>
	<meta
		name="description"
		content="Hide secret messages within any text using invisible Unicode characters. Share publicly, reveal selectively. Try our interactive demo now!"
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
	<!-- Hero Section with Demo -->
	<section class="relative overflow-hidden">
		<!-- Gradient Overlay -->
		<div
			class="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-secondary-500/10 to-tertiary-500/10"
		></div>

		<div class="container mx-auto px-4 py-12 lg:py-20 relative z-10">
			<div class="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
				<!-- Left Side: Value Proposition -->
				<div class="space-y-8 text-center lg:text-left">
					<div class="inline-flex items-center justify-center lg:justify-start">
						<div
							class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-5xl md:text-6xl animate-pulse"
						>
							👻
						</div>
					</div>

					<div class="space-y-4">
						<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
							Hide Secrets in
							<span
								class="bg-gradient-to-r from-primary-400 via-secondary-400 to-tertiary-400 bg-clip-text text-transparent"
							>
								Plain Sight
							</span>
						</h1>
						<p class="text-xl md:text-2xl opacity-90 max-w-2xl">
							Share messages publicly with hidden content only you choose to reveal. Perfect for
							announcements, Easter eggs, and dual-layer communication.
						</p>
					</div>

					<!-- Key Features -->
					<div class="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
						<div class="card p-4 variant-ghost-primary">
							<div class="text-2xl mb-1">🔒</div>
							<div class="font-semibold text-sm">Invisible Unicode</div>
						</div>
						<div class="card p-4 variant-ghost-secondary">
							<div class="text-2xl mb-1">🌐</div>
							<div class="font-semibold text-sm">Share Anywhere</div>
						</div>
						<div class="card p-4 variant-ghost-tertiary">
							<div class="text-2xl mb-1">⚡</div>
							<div class="font-semibold text-sm">Instant Reveal</div>
						</div>
						<div class="card p-4 variant-ghost-surface">
							<div class="text-2xl mb-1">🚀</div>
							<div class="font-semibold text-sm">No Sign-Up</div>
						</div>
					</div>

					<!-- CTA Buttons -->
					<div class="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
						<a href="/compose" class="btn variant-filled-primary btn-lg">
							<span>✨</span>
							<span>Create GhostPost</span>
						</a>
						<a href={installUrl} class="btn variant-ghost-surface btn-lg">
							<span>⚡</span>
							<span>Install Reveal Button</span>
						</a>
					</div>
				</div>

				<!-- Right Side: Interactive Demo -->
				<div class="space-y-6">
					<div class="card p-6 md:p-8 variant-glass-surface space-y-6">
						<div class="text-center space-y-2">
							<h2 class="h2 text-2xl md:text-3xl font-bold">Try It Now</h2>
							<p class="text-sm opacity-75">
								Enter your message and secret, then see the magic happen
							</p>
						</div>

						<!-- Input Form -->
						<div class="space-y-4">
							{#if errorMessage}
								<div class="card p-4 variant-ghost-error">
									<p class="text-sm text-error-500">{errorMessage}</p>
								</div>
							{/if}

							<div class="space-y-2">
								<label for="visible-msg" class="label">
									<span class="text-sm font-semibold">Public Message</span>
								</label>
								<textarea
									id="visible-msg"
									class="textarea"
									rows="2"
									placeholder="Everyone can see this..."
									bind:value={demoVisibleMessage}
									disabled={isEncoding || isDecoding}
								></textarea>
							</div>

							<div class="space-y-2">
								<label for="secret-msg" class="label">
									<span class="text-sm font-semibold">Secret Message</span>
								</label>
								<textarea
									id="secret-msg"
									class="textarea"
									rows="2"
									placeholder="This will be hidden..."
									bind:value={demoSecretMessage}
									disabled={isEncoding || isDecoding}
								></textarea>
							</div>

							<button
								class="btn variant-filled-primary w-full"
								onclick={handleEncode}
								disabled={isEncoding || !demoVisibleMessage.trim() || !demoSecretMessage.trim()}
							>
								{#if isEncoding}
									<span class="animate-spin">⚙️</span>
									<span>Encoding...</span>
								{:else}
									<span>🔒</span>
									<span>Encode Message</span>
								{/if}
							</button>
						</div>

						<!-- Encoded Result -->
						{#if showEncoded}
							<div class="space-y-4 animate-fade-in">
								<div class="border-t border-surface-500/20 pt-4">
									<div class="space-y-2">
										<div class="flex items-center justify-between">
											<label class="label">
												<span class="text-sm font-semibold">Encoded Message</span>
											</label>
											<button class="btn btn-sm variant-ghost-surface" onclick={handleCopy}>
												📋 Copy
											</button>
										</div>
										<div class="card p-4 variant-ghost-success">
											<p class="text-sm break-all font-mono">{demoEncodedMessage}</p>
										</div>
										<p class="text-xs opacity-75 text-center">
											👀 Looks normal, right? The secret is invisible!
										</p>
									</div>
								</div>

								<button
									class="btn variant-filled-secondary w-full"
									onclick={handleDecode}
									disabled={isDecoding}
								>
									{#if isDecoding}
										<span class="animate-spin">⚙️</span>
										<span>Decoding...</span>
									{:else}
										<span>🔓</span>
										<span>Reveal Secret</span>
									{/if}
								</button>
							</div>
						{/if}

						<!-- Decoded Result -->
						{#if showDecoded}
							<div class="space-y-4 animate-fade-in">
								<div class="border-t border-surface-500/20 pt-4">
									<div class="space-y-2">
										<label class="label">
											<span class="text-sm font-semibold">🎉 Secret Revealed!</span>
										</label>
										<div class="card p-6 variant-glass-primary text-center">
											<p class="text-lg font-bold">{demoDecodedSecret}</p>
										</div>
									</div>
								</div>

								<button class="btn variant-ghost-surface w-full" onclick={resetDemo}>
									<span>🔄</span>
									<span>Try Again</span>
								</button>
							</div>
						{/if}
					</div>

					<!-- Overlay Detection Info -->
					<div class="card p-4 variant-ghost-primary text-center text-sm">
						<p class="font-semibold mb-2">💡 Live Demo!</p>
						<p class="opacity-90">
							The 👻 reveal button in the bottom-right corner will automatically detect your encoded
							message! Watch the counter update when you encode.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="bg-surface-800/50 py-16">
		<div class="container mx-auto px-4 max-w-6xl">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
				<p class="text-lg opacity-75">Three simple steps to hidden messaging</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-3xl"
					>
						✍️
					</div>
					<h3 class="h3 text-xl font-semibold">Write Your Message</h3>
					<p class="text-sm opacity-75">
						Create a public message and add your secret content. Use the demo above to try it!
					</p>
				</div>

				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center text-3xl"
					>
						🔒
					</div>
					<h3 class="h3 text-xl font-semibold">Encode & Share</h3>
					<p class="text-sm opacity-75">
						We hide your secret using invisible Unicode. Share on Twitter, Discord, anywhere text
						works!
					</p>
				</div>

				<div class="text-center space-y-4">
					<div
						class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-tertiary-500 to-tertiary-600 flex items-center justify-center text-3xl"
					>
						🔓
					</div>
					<h3 class="h3 text-xl font-semibold">Recipients Decode</h3>
					<p class="text-sm opacity-75">
						Those with the reveal button or decode link see the secret. Others see just the public
						message!
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Grid -->
	<section class="container mx-auto px-4 py-16">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
				<p class="text-lg opacity-75">Everything you need for secret messaging</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">🔒</div>
					<h3 class="h3 text-lg font-semibold">Invisible Encoding</h3>
					<p class="text-sm opacity-75">
						Uses invisible Unicode characters imperceptible to the human eye
					</p>
				</div>

				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">🤖</div>
					<h3 class="h3 text-lg font-semibold">AI-Powered</h3>
					<p class="text-sm opacity-75">Generate platform-optimized content with AI integration</p>
				</div>

				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">📊</div>
					<h3 class="h3 text-lg font-semibold">Analytics Tracking</h3>
					<p class="text-sm opacity-75">
						Track decode events with detailed analytics (when signed in)
					</p>
				</div>

				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">🌐</div>
					<h3 class="h3 text-lg font-semibold">Universal Sharing</h3>
					<p class="text-sm opacity-75">
						Works on Twitter, LinkedIn, Discord, or anywhere text is supported
					</p>
				</div>

				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">⚡</div>
					<h3 class="h3 text-lg font-semibold">Auto-Detection</h3>
					<p class="text-sm opacity-75">
						Reveal button automatically finds hidden messages on any page
					</p>
				</div>

				<div class="card p-6 space-y-3 hover:scale-105 transition-transform">
					<div class="text-4xl">🚀</div>
					<h3 class="h3 text-lg font-semibold">No Sign-Up Required</h3>
					<p class="text-sm opacity-75">
						Start encoding and decoding immediately, no account needed
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Use Cases -->
	<section class="bg-surface-800/50 py-16">
		<div class="container mx-auto px-4 max-w-6xl">
			<div class="text-center mb-12">
				<h2 class="h2 text-3xl md:text-4xl font-bold mb-4">Perfect For</h2>
				<p class="text-lg opacity-75">Endless possibilities for hidden messaging</p>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				<div class="card p-6 text-center space-y-3 variant-ghost-primary">
					<div class="text-5xl">💼</div>
					<h3 class="h3 text-lg font-semibold">Business</h3>
					<p class="text-sm opacity-75">Share announcements with hidden stakeholder details</p>
				</div>

				<div class="card p-6 text-center space-y-3 variant-ghost-secondary">
					<div class="text-5xl">🎮</div>
					<h3 class="h3 text-lg font-semibold">Gaming</h3>
					<p class="text-sm opacity-75">Hide Easter eggs and secret messages in posts</p>
				</div>

				<div class="card p-6 text-center space-y-3 variant-ghost-tertiary">
					<div class="text-5xl">💬</div>
					<h3 class="h3 text-lg font-semibold">Social</h3>
					<p class="text-sm opacity-75">Dual-layer messages for different audiences</p>
				</div>

				<div class="card p-6 text-center space-y-3 variant-ghost-surface">
					<div class="text-5xl">🎓</div>
					<h3 class="h3 text-lg font-semibold">Education</h3>
					<p class="text-sm opacity-75">Interactive learning with hidden answers</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Install CTA -->
	<section class="bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 py-16">
		<div class="container mx-auto px-4 text-center">
			<div class="max-w-3xl mx-auto space-y-8">
				<div class="flex justify-center">
					<span class="text-7xl md:text-8xl">👻</span>
				</div>
				<h2 class="h2 text-3xl md:text-5xl font-bold text-white">
					Ready to Discover Hidden Messages?
				</h2>
				<p class="text-xl text-white/90">
					Install the Reveal Button to automatically detect GhostPost messages on any website
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a
						href="/install"
						class="btn variant-filled bg-white text-primary-500 btn-lg hover:scale-105 transition-transform"
					>
						<span>⚡</span>
						<span>Install Reveal Button</span>
					</a>
					<a
						href="/demo"
						class="btn variant-ringed ring-white text-white btn-lg hover:scale-105 transition-transform"
					>
						<span>🧪</span>
						<span>Try Live Demo</span>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<section class="container mx-auto px-4 py-12">
		<div class="max-w-4xl mx-auto">
			<div class="card p-6 variant-ghost-surface">
				<div class="text-center space-y-4">
					<h3 class="h3 font-semibold">💡 Privacy First</h3>
					<p class="text-sm opacity-75">
						All encoding and decoding happens in your browser. We don't see your secrets. Optional
						analytics track decode events anonymously without personal information.
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

	.animate-fade-in {
		animation: fadeIn 0.5s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
