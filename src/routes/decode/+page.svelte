<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { clipboard } from '@skeletonlabs/skeleton';
	import { decodeMessage, initWasm } from '$lib/ghostpost';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import confetti from 'canvas-confetti';
	import type { RevealStatus, RevealResult } from '$lib/types/limited-reveals';

	let encodedInput = '';
	let decodedSecret = '';
	let isDecoding = false;
	let error = '';
	let showResult = false;

	// Limited reveals state
	let revealStatus: RevealStatus | null = null;
	let revealResult: RevealResult | null = null;
	let isCheckingStatus = false;

	// Constants for text size thresholds
	const MAX_AUTO_DECODE_SIZE = 2000; // ~2KB limit for auto-decode
	const MAX_SEGMENT_EXTRACT_SIZE = 5000; // ~5KB threshold for segment extraction

	// Regular expression for detecting invisible Unicode characters
	// Must match the encoding scheme: \u2060, \u200B, \u200C, \u200D, \u200E, \u200F, \u202D, \u202C
	// Plus \uFEFF used as delimiter
	const INVISIBLE_CHARS_REGEX = /[\u200B\u200C\u200D\u200E\u200F\u202C\u202D\u2060\uFEFF]/;

	onMount(async () => {
		await initWasm();

		// Check for text parameter from URL (for mobile share or overlay button)
		const urlText = $page.url.searchParams.get('text');
		if (urlText) {
			encodedInput = decodeURIComponent(urlText);

			// Only auto-decode if text is small enough to prevent unresponsiveness
			// Large texts from overlay button should be manually decoded by user
			if (encodedInput.length <= MAX_AUTO_DECODE_SIZE) {
				await handleDecode();
			}
			// For larger texts, we let the user click the decode button manually
		}
	});

	// Extract segments of text that contain invisible Unicode characters
	function extractEncodedSegments(text: string): string[] {
		const segments: string[] = [];

		// Split by newlines and carriage returns to preserve encoded content
		const lines = text.split(/[\r\n]+/);

		for (const line of lines) {
			if (line.trim() && INVISIBLE_CHARS_REGEX.test(line)) {
				segments.push(line.trim());
			}
		}

		return segments;
	}

	async function handleDecode() {
		if (!encodedInput.trim()) {
			error = 'Please paste an encoded message';
			return;
		}

		isDecoding = true;
		error = '';
		showResult = false;
		revealResult = null;

		try {
			// For large texts, extract only segments with invisible characters
			const inputText = encodedInput.trim();
			const segments = extractEncodedSegments(inputText);

			// If we found segments with invisible chars in large text, decode only those segments
			// Otherwise, decode the full text (for smaller texts or when no segments found)
			const textToDecode =
				segments.length > 0 && inputText.length > MAX_SEGMENT_EXTRACT_SIZE
					? segments.join('\n')
					: inputText;

			const result = await decodeMessage(textToDecode);

			if (!result.message || result.message.trim() === '') {
				error = 'No hidden message found in the text';
			} else {
				// Check limited reveals status if postId is present
				if (result.postId) {
					isCheckingStatus = true;
					try {
						// Check reveal status first
						const statusResponse = await fetch(`/api/limited-reveals/status?post_id=${result.postId}`);
						const statusData = await statusResponse.json();
						
						if (statusData.success && statusData.status) {
							revealStatus = statusData.status;

							// If expired, don't show the secret
							if (revealStatus.is_expired || !revealStatus.can_reveal) {
								error = 'This secret has expired — all reveals are gone forever 💔';
								showResult = false;
								isDecoding = false;
								isCheckingStatus = false;
								return;
							}

							// Record the reveal
							const revealResponse = await fetch('/api/limited-reveals/reveal', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									post_id: result.postId,
									user_fingerprint: generateFingerprint()
								})
							});

							const revealData = await revealResponse.json();
							
							if (!revealData.success) {
								error = revealData.message || 'Failed to reveal secret';
								showResult = false;
								isDecoding = false;
								isCheckingStatus = false;
								return;
							}

							revealResult = revealData;

							// Show confetti for last 10 reveals
							if (revealResult.remaining !== null && revealResult.remaining <= 10 && revealResult.remaining >= 0) {
								triggerConfetti();
							}
						}
					} catch (err) {
						console.warn('Limited reveals check failed, showing message anyway:', err);
					}
					isCheckingStatus = false;

					// Track analytics if postId is present
					try {
						await fetch('/api/analytics/track', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								postId: result.postId
							})
						});
					} catch (err) {
						// Don't show error to user if analytics tracking fails
						console.warn('Analytics tracking failed:', err);
					}
				}

				decodedSecret = result.message;
				showResult = true;
				error = '';
			}
		} catch (err) {
			error = 'Failed to decode message. Make sure it contains a hidden secret.';
			console.error(err);
		} finally {
			isDecoding = false;
		}
	}

	function generateFingerprint(): string {
		// Simple fingerprint based on browser characteristics
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const txt = 'ghostpost';
		if (ctx) {
			ctx.textBaseline = 'top';
			ctx.font = '14px Arial';
			ctx.fillText(txt, 2, 2);
		}
		const b64 = canvas.toDataURL().replace('data:image/png;base64,', '');
		const fingerprint = `${navigator.userAgent}_${b64.slice(0, 20)}`;
		
		// Simple hash
		let hash = 0;
		for (let i = 0; i < fingerprint.length; i++) {
			const char = fingerprint.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash).toString(36);
	}

	function triggerConfetti() {
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 }
		});
	}

	function handleClear() {
		encodedInput = '';
		decodedSecret = '';
		showResult = false;
		error = '';
		revealStatus = null;
		revealResult = null;
	}

	function isImageData(text: string): boolean {
		return text.startsWith('data:image/');
	}
</script>

<svelte:head>
	<title>Decode Hidden Messages</title>
</svelte:head>

<AuthGuard>
	<div class="container mx-auto p-8 max-w-4xl space-y-6">
		<div class="flex justify-between items-center">
			<h1 class="h1">🔍 Decode Hidden Messages</h1>
			<a href="/compose" class="btn variant-ghost-surface">
				<span>✍️</span>
				<span>Compose New</span>
			</a>
		</div>

		<div class="card p-6 space-y-4">
			<h2 class="h2">Reveal the Secret</h2>
			<p class="text-sm opacity-75">
				Paste any message that might contain a hidden secret, and we'll reveal what's hidden inside.
			</p>

			<label class="label">
				<span>Paste Encoded Message Here</span>
				<textarea
					class="textarea"
					rows="6"
					bind:value={encodedInput}
					placeholder="Paste the encoded message here to reveal its hidden secret..."
				/>
			</label>

			<div class="flex gap-4">
				<button
					class="btn variant-filled-primary"
					on:click={handleDecode}
					disabled={isDecoding || !encodedInput.trim()}
				>
					{#if isDecoding}
						<span>🔓 Decoding...</span>
					{:else}
						<span>🔓 Decode Secret</span>
					{/if}
				</button>
				<button class="btn variant-ghost" on:click={handleClear} disabled={!encodedInput}>
					Clear
				</button>
			</div>
		</div>

		{#if showResult && decodedSecret}
			<div class="card p-6 space-y-4 variant-ghost-success">
				<h2 class="h2">✨ Hidden Secret Revealed!</h2>

				<!-- Limited Reveals Status -->
				{#if revealResult && revealResult.reveal_number !== null}
					<div class="card p-4 space-y-2" class:variant-ghost-warning={revealResult.remaining !== null && revealResult.remaining <= 20 && revealResult.remaining > 0} class:variant-ghost-error={revealResult.remaining === 0} class:variant-ghost-primary={!revealResult.remaining || revealResult.remaining > 20}>
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<p class="font-bold text-lg" class:text-error-500={revealResult.remaining !== null && revealResult.remaining <= 5}>
									{#if revealResult.remaining === 0}
										🔥 SOLD OUT FOREVER! 🔥
									{:else if revealResult.remaining !== null && revealResult.remaining <= 5}
										⚠️ ONLY {revealResult.remaining} LEFT! ⚠️
									{:else}
										🎉 Limited Edition Reveal!
									{/if}
								</p>
								<p class="text-sm mt-1">
									{revealResult.message}
								</p>
							</div>
							{#if revealResult.remaining !== null && revealResult.total_reveals}
								<div class="text-right ml-4">
									<div class="text-2xl font-bold" class:text-error-500={revealResult.remaining <= 5} class:animate-pulse={revealResult.remaining <= 20}>
										{revealResult.reveal_number}/{revealResult.total_reveals}
									</div>
									<div class="text-xs opacity-75">reveals</div>
								</div>
							{/if}
						</div>

						{#if revealResult.remaining !== null && revealResult.total_reveals}
							<!-- Progress bar -->
							<div class="w-full bg-surface-700 rounded-full h-4 overflow-hidden">
								<div 
									class="h-full transition-all duration-500"
									class:bg-primary-500={revealResult.remaining > 20}
									class:bg-warning-500={revealResult.remaining <= 20 && revealResult.remaining > 5}
									class:bg-error-500={revealResult.remaining <= 5}
									style="width: {(revealResult.reveal_number / revealResult.total_reveals) * 100}%"
								></div>
							</div>
						{/if}

						{#if revealResult.remaining !== null && revealResult.remaining <= 10 && revealResult.remaining > 0}
							<p class="text-xs text-center opacity-75 animate-pulse">
								⚡ Only {revealResult.remaining} {revealResult.remaining === 1 ? 'person' : 'people'} can reveal this secret before it's gone forever!
							</p>
						{:else if revealResult.remaining === 0}
							<p class="text-xs text-center font-bold">
								💎 You got the LAST reveal! This secret is now locked forever.
							</p>
						{/if}

						<!-- Share text generator -->
						{#if revealResult.reveal_number && revealResult.total_reveals}
							<div class="card p-3 variant-ghost-surface">
								<p class="text-xs font-bold mb-2">Share your achievement:</p>
								<div class="flex gap-2">
									<input 
										type="text" 
										class="input text-xs flex-1" 
										readonly 
										value="I just got reveal #{revealResult.reveal_number} of {revealResult.total_reveals}{revealResult.remaining ? ` — only ${revealResult.remaining} left forever!` : ' — SOLD OUT!'} 👻"
										data-clipboard="share-text"
									/>
									<button class="btn btn-sm variant-filled-primary" use:clipboard={{ input: 'share-text' }}>
										Copy
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if isImageData(decodedSecret)}
					<div class="space-y-2">
						<p class="text-sm opacity-75">This message contains a hidden image:</p>
						<img src={decodedSecret} alt="Decoded hidden image" class="max-w-full rounded-lg" />
					</div>
				{:else}
					<label class="label">
						<span>Decoded Message</span>
						<textarea
							class="textarea"
							rows="5"
							readonly
							data-clipboard="decoded"
							value={decodedSecret}
						/>
					</label>

					<button class="btn variant-filled" use:clipboard={{ input: 'decoded' }}>
						Copy Secret
					</button>
				{/if}
			</div>
		{/if}

		{#if error}
			<div class="card p-4 variant-ghost-error">
				<p>❌ {error}</p>
			</div>
		{/if}

		<div class="card p-6 variant-ghost-surface">
			<h3 class="h3 mb-2">💡 About Hidden Messages</h3>
			<div class="space-y-2 text-sm">
				<p>
					Messages created with our AI Ghostpost Composer contain hidden secrets encoded using
					invisible Unicode characters. These characters are imperceptible to the human eye but can
					be decoded to reveal the hidden content.
				</p>
				<p>
					Simply paste any message you've received into the box above to reveal its secret! The
					message can contain either hidden text or even a hidden image.
				</p>
				<p class="opacity-75">
					Want to create your own secret messages? Go to the
					<a href="/compose" class="anchor">Compose page</a> to get started!
				</p>
			</div>
		</div>

		<div class="card p-6">
			<h3 class="h3 mb-4">🧪 Try It Out</h3>
			<p class="text-sm mb-4">
				Don't have an encoded message? Try this example (copy and paste it above):
			</p>
			<div class="code-block bg-surface-700 p-4 rounded">
				<code class="text-xs"
					>Hello
					World‌‍‌‌‍‌‍‌‍‌‌‍‌‌‍‌‌‍‌‍‌‍‌‌‍‌‍‌‌‍‌‍‍‌‍‌‌‍‌‌‍‌‌‍‌‍‌‍‌‌‍‌‍‌‌‍‌‌‍‌‌‍‌‍‌‍‌‌‍‌‌‌‌‍‌‌‍‌‍‌‍‌‌‍‌‍‌‌‍‌‌‍‌‍‌‍‌‌‍‌‍‌‌‍‌‍‍</code
				>
			</div>
			<p class="text-xs opacity-50 mt-2">
				(This message contains the hidden text "This is a secret")
			</p>
		</div>
	</div>
</AuthGuard>
