<script lang="ts">
	import { onMount } from 'svelte';
	import { clipboard } from '@skeletonlabs/skeleton';
	import { encodeMessage, encodeImage, initWasm } from '$lib/ghostpost';

	let prompt = '';
	let platform: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' = 'twitter';
	let visibleMessage = '';
	let secretMessage = '';
	let secretType: 'text' | 'image' = 'text';
	let secretImage: File | null = null;
	let imagePreview = '';
	let encodedMessage = '';
	let currentPostId = '';
	let isGenerating = false;
	let isEncoding = false;
	let error = '';
	let postSuccess = false;
	let postInstructions = '';
	let postUrl = '';

	onMount(async () => {
		await initWasm();
	});

	async function generateContent() {
		if (!prompt.trim()) {
			error = 'Please enter a prompt';
			return;
		}

		isGenerating = true;
		error = '';

		try {
			const response = await fetch('/api/ai-compose', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					prompt: prompt,
					platform: platform
				})
			});

			const data = await response.json();

			if (data.success) {
				visibleMessage = data.content;
				error = '';
			} else {
				error = data.error || 'Failed to generate content';
			}
		} catch (err) {
			error = 'Network error: Failed to connect to API';
			console.error(err);
		} finally {
			isGenerating = false;
		}
	}

	async function handleSecretFile(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file && file.type.startsWith('image/')) {
			secretImage = file;
			secretType = 'image';
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
			secretMessage = ''; // Clear text if image selected
		} else {
			secretImage = null;
			imagePreview = '';
			error = 'Please select a valid image file';
		}
	}

	async function handleEncode() {
		if (!visibleMessage.trim()) {
			error = 'Visible message is required';
			return;
		}

		if (secretType === 'text' && !secretMessage.trim()) {
			error = 'Secret text message is required';
			return;
		}

		if (secretType === 'image' && !secretImage) {
			error = 'Please select an image to hide';
			return;
		}

		isEncoding = true;
		error = '';

		try {
			let result;
			if (secretType === 'image') {
				result = await encodeImage(visibleMessage, secretImage!);
			} else {
				result = await encodeMessage(visibleMessage, secretMessage);
			}
			encodedMessage = result.encoded;
			currentPostId = result.postId || '';
			error = '';
		} catch (err) {
			error = 'Failed to encode message';
			console.error(err);
		} finally {
			isEncoding = false;
		}
	}

	async function handlePost() {
		if (!encodedMessage) {
			error = 'Please encode a message first';
			return;
		}

		try {
			const response = await fetch('/api/post', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: encodedMessage,
					platform: platform
				})
			});

			const data = await response.json();

			if (data.success) {
				postSuccess = true;
				postInstructions = data.instructions;
				postUrl = data.postUrl;
				// Copy to clipboard automatically
				navigator.clipboard.writeText(encodedMessage);
			} else {
				error = data.error || 'Failed to prepare post';
			}
		} catch (err) {
			error = 'Network error: Failed to connect to API';
			console.error(err);
		}
	}

	function reset() {
		postSuccess = false;
		postInstructions = '';
		postUrl = '';
	}
</script>

<svelte:head>
	<title>AI Ghostpost Composer</title>
</svelte:head>

<div class="container mx-auto p-8 max-w-4xl space-y-6">
	<div class="flex justify-between items-center">
		<h1 class="h1">AI Ghostpost Composer</h1>
		<a href="/decode" class="btn variant-ghost-surface">
			<span>🔍</span>
			<span>Decode Message</span>
		</a>
	</div>

	<div class="card p-6 space-y-4">
		<h2 class="h2">Step 1: Generate Content with AI</h2>
		<p class="text-sm opacity-75">
			Describe what you want to post, and AI will generate content optimized for your chosen
			platform.
		</p>

		<label class="label">
			<span>Platform</span>
			<select class="select" bind:value={platform}>
				<option value="twitter">Twitter/X</option>
				<option value="linkedin">LinkedIn</option>
				<option value="facebook">Facebook</option>
				<option value="tiktok">TikTok</option>
			</select>
		</label>

		<label class="label">
			<span>What do you want to post about?</span>
			<textarea
				class="textarea"
				rows="3"
				bind:value={prompt}
				placeholder="e.g., Share my excitement about learning AI and machine learning..."
			/>
		</label>

		<button class="btn variant-filled-primary" on:click={generateContent} disabled={isGenerating}>
			{#if isGenerating}
				<span>⏳ Generating...</span>
			{:else}
				<span>✨ Generate Content</span>
			{/if}
		</button>
	</div>

	{#if visibleMessage}
		<div class="card p-6 space-y-4">
			<h2 class="h2">Step 2: Add Your Secret Message</h2>
			<p class="text-sm opacity-75">
				This is what people will see publicly. You can edit it or use the AI-generated content.
			</p>

			<label class="label">
				<span>Visible Message (what everyone sees)</span>
				<textarea class="textarea" rows="4" bind:value={visibleMessage} />
			</label>

			<label class="label">
				<span>Secret Type</span>
				<select class="select" bind:value={secretType}>
					<option value="text">Text</option>
					<option value="image">Image</option>
				</select>
			</label>

			{#if secretType === 'text'}
				<label class="label">
					<span>Secret Message (hidden in the post)</span>
					<textarea
						class="textarea"
						rows="3"
						bind:value={secretMessage}
						placeholder="Enter your secret message here..."
					/>
				</label>
			{:else}
				<label class="label">
					<span>Secret Image (to hide in the post)</span>
					<input
						type="file"
						accept="image/*"
						class="file-input"
						on:change={handleSecretFile}
					/>
					{#if imagePreview}
						<div class="mt-2">
							<img src={imagePreview} alt="Preview" class="max-w-xs max-h-48 object-contain rounded" />
						</div>
					{/if}
				</label>
			{/if}

			<button
				class="btn variant-filled-secondary"
				on:click={handleEncode}
				disabled={isEncoding || (secretType === 'text' && !secretMessage.trim()) || (secretType === 'image' && !secretImage)}
			>
				{#if isEncoding}
					<span>🔒 Encoding...</span>
				{:else}
					<span>🔒 Encode Secret</span>
				{/if}
			</button>
		</div>
	{/if}

	{#if encodedMessage}
		<div class="card p-6 space-y-4">
			<h2 class="h2">Step 3: Copy & Share</h2>
			<p class="text-sm opacity-75">
				Your message has been encoded! Copy it and paste it on your social media platform.
			</p>

			{#if currentPostId}
				<div class="card p-4 variant-ghost-success">
					<p class="text-sm font-bold">📊 Analytics Enabled</p>
					<p class="text-xs opacity-75 mt-1">
						Post ID: <code class="code">{currentPostId}</code>
					</p>
					<p class="text-xs opacity-75 mt-2">
						Track this post's analytics on the
						<a href="/dashboard" class="anchor">Dashboard page</a>
					</p>
				</div>
			{/if}

			<label class="label">
				<span>Encoded Message (copy this)</span>
				<textarea
					class="textarea"
					rows="5"
					readonly
					data-clipboard="encoded"
					value={encodedMessage}
				/>
			</label>

			<div class="flex gap-4">
				<button class="btn variant-filled" use:clipboard={{ input: 'encoded' }} on:click={reset}>
					📋 Copy to Clipboard
				</button>
				<button class="btn variant-filled-primary" on:click={handlePost}>
					🚀 Prepare to Post on {platform.charAt(0).toUpperCase() + platform.slice(1)}
				</button>
			</div>
		</div>
	{/if}

	{#if postSuccess}
		<div class="card p-6 space-y-4 variant-ghost-success">
			<h2 class="h2">✅ Ready to Post!</h2>
			<p>{postInstructions}</p>
			<p class="text-sm opacity-75">
				The encoded message has been copied to your clipboard. Now manually paste it on the
				platform!
			</p>
			<a href={postUrl} target="_blank" rel="noopener noreferrer" class="btn variant-filled">
				Open {platform.charAt(0).toUpperCase() + platform.slice(1)}
			</a>
		</div>
	{/if}

	{#if error}
		<div class="card p-4 variant-ghost-error">
			<p>❌ {error}</p>
		</div>
	{/if}

	<div class="card p-6 variant-ghost-surface">
		<h3 class="h3 mb-2">💡 How it works</h3>
		<ol class="list-decimal list-inside space-y-2 text-sm">
			<li>AI generates content optimized for your chosen platform</li>
			<li>You add a secret message that gets hidden using invisible Unicode characters</li>
			<li>
				Copy the encoded message and paste it anywhere - it looks normal but contains your secret!
			</li>
			<li>Recipients can decode it using the <a href="/decode" class="anchor">Decode page</a></li>
		</ol>
	</div>
</div>
