<script lang="ts">
	import { onMount } from 'svelte';
	import { clipboard } from '@skeletonlabs/skeleton';
	import { decodeMessage, initWasm } from '$lib/ghostpost';

	let encodedInput = '';
	let decodedSecret = '';
	let isDecoding = false;
	let error = '';
	let showResult = false;

	onMount(async () => {
		await initWasm();
	});

	async function handleDecode() {
		if (!encodedInput.trim()) {
			error = 'Please paste an encoded message';
			return;
		}

		isDecoding = true;
		error = '';
		showResult = false;

		try {
			decodedSecret = await decodeMessage(encodedInput);

			if (!decodedSecret || decodedSecret.trim() === '') {
				error = 'No hidden message found in the text';
			} else {
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
