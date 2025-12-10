<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { clipboard } from '@skeletonlabs/skeleton';
	import { decodeMessage, initWasm } from '$lib/ghostpost';

	let encodedInput = '';
	let decodedSecret = '';
	let isDecoding = false;
	let error = '';
	let showResult = false;

	onMount(async () => {
		await initWasm();
		
		// Check for text parameter from URL (for mobile share or overlay button)
		const urlText = $page.url.searchParams.get('text');
		if (urlText) {
			encodedInput = decodeURIComponent(urlText);
			
			// Only auto-decode if text is small enough to prevent unresponsiveness
			// Large texts from overlay button should be manually decoded by user
			const MAX_AUTO_DECODE_SIZE = 2000; // ~2KB limit for auto-decode
			if (encodedInput.length <= MAX_AUTO_DECODE_SIZE) {
				await handleDecode();
			}
			// For larger texts, we let the user click the decode button manually
		}
	});

	// Extract segments of text that contain invisible Unicode characters
	function extractEncodedSegments(text: string): string[] {
		const invisibleChars = /[\u200B\u200C\u200D\u2060\uFEFF\u180E]/;
		const segments: string[] = [];
		
		// Split by common delimiters while preserving encoded content
		const lines = text.split(/\n+/);
		
		for (const line of lines) {
			if (line.trim() && invisibleChars.test(line)) {
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

		try {
			// For large texts, extract only segments with invisible characters
			const inputText = encodedInput.trim();
			const segments = extractEncodedSegments(inputText);
			
			// If we found specific segments, try decoding them instead of the full text
			const textToDecode = segments.length > 0 && inputText.length > 5000 
				? segments.join('\n') 
				: inputText;
			
			const result = await decodeMessage(textToDecode);

			if (!result.message || result.message.trim() === '') {
				error = 'No hidden message found in the text';
			} else {
				decodedSecret = result.message;
				showResult = true;
				error = '';

				// Track analytics if postId is present
				if (result.postId) {
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
			}
		} catch (err) {
			error = 'Failed to decode message. Make sure it contains a hidden secret.';
			console.error(err);
		} finally {
			isDecoding = false;
		}
	}

	function handleClear() {
		encodedInput = '';
		decodedSecret = '';
		showResult = false;
		error = '';
	}

	function isImageData(text: string): boolean {
		return text.startsWith('data:image/');
	}
</script>

<svelte:head>
	<title>Decode Hidden Messages</title>
</svelte:head>

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
					�� Copy Secret
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
				invisible Unicode characters. These characters are imperceptible to the human eye but can be
				decoded to reveal the hidden content.
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
