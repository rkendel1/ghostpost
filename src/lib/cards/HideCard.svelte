<script lang="ts">
	import { FileButton, clipboard } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import { initWasm, encodeMessage as encodeMsg, encodeImage as encodeImg } from '$lib/ghostpost';

	onMount(async () => await initWasm());

	export let message = '';
	export let secret = '';
	let encodedText = encodeTextMessage(message, secret);

	export let hiddenType: string = 'text';

	let image = '';
	let encodedImage: Promise<string> = Promise.resolve('');
	let imageError = '';

	async function imageToBase64(imageFile: File): Promise<string> {
		const arrayBuffer: ArrayBuffer = await imageFile.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		let binaryString: string = '';
		uint8Array.forEach((byte) => {
			binaryString += String.fromCharCode(byte);
		});

		return btoa(binaryString);
	}

	async function onFileChange(e: Event) {
		try {
			imageError = '';
			const firstFile: File = (e.target as HTMLInputElement)?.files?.item(0)!;
			if (!firstFile) return;

			// Show original image for preview
			const baseEncoded = await imageToBase64(firstFile);
			image = `data:${firstFile.type};base64,${baseEncoded}`;

			// Encode with automatic resizing/compression
			encodedImage = encodeImageFile(message, firstFile);
		} catch (err) {
			imageError = err instanceof Error ? err.message : 'Failed to process image';
			encodedImage = Promise.reject(err);
		}
	}

	async function encodeImageFile(msg: string, imageFile: File): Promise<string> {
		const result = await encodeImg(msg, imageFile, false);
		return result.encoded;
	}

	async function encodeTextMessage(msg: string, secret: string): Promise<string> {
		if (!msg || !secret) return '';
		const result = await encodeMsg(msg, secret, false);
		return result.encoded;
	}

	function handleInput(e: Event) {
		encodedText = encodeTextMessage(message, secret);
	}
</script>

<span>Shown text</span>
<textarea
	class="textarea"
	bind:value={message}
	placeholder="Enter a message you want to be shown."
/>

{#if hiddenType == 'image'}
	<h3>Image</h3>
	{#if imageError}
		<div class="alert variant-filled-error mb-4">
			<p>{imageError}</p>
		</div>
	{/if}
	<p class="text-sm opacity-75 mb-2">
		⚠️ For best results, use images under 100KB. Large images will be automatically resized and
		compressed.
	</p>
	<FileButton
		class="btn variant-filled"
		name="imageToHide"
		disabled={message.length === 0}
		on:change={onFileChange}
	/>
	<br />
	<img src={image} width="300" alt="" />
	<br /><br />
	<span>Result</span>
	{#await encodedImage}
		<textarea class="textarea" value="Processing image..." />
	{:then text}
		<textarea class="textarea" disabled={true} data-clipboard="encodedImage" value={text} />
		<button class="btn btn-sm mr-4 variant-filled" use:clipboard={{ input: 'encodedImage' }}
			>Copy</button
		>
	{:catch error}
		<textarea
			class="textarea variant-filled-secondary"
			value={error?.message || 'Error occurred'}
		/>
	{/await}
{:else}
	<h3>Hidden Message</h3>
	<textarea
		class="textarea"
		bind:value={secret}
		on:input={handleInput}
		placeholder="Enter a message you want to hide."
		disabled={message.length === 0}
	/>
	<br /><br />
	<span>Result</span>
	{#await encodedText}
		<textarea class="textarea" value="Generating..." />
		<button class="btn btn-sm mr-4 variant-filled" disabled={true}>Copy</button>
	{:then text}
		<textarea class="textarea" data-clipboard="encodedText" value={text} />
		<button class="btn btn-sm mr-4 variant-filled" use:clipboard={{ input: 'encodedText' }}
			>Copy</button
		>
	{:catch error}
		<textarea class="textarea variant-filled-secondary" value="Error occurred" />
		<button class="btn btn-sm mr-4 variant-filled-secondary" disabled={true}>Copy</button>
	{/await}
{/if}
