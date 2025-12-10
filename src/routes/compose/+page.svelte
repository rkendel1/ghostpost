<script lang="ts">
	import { onMount } from 'svelte';
	import { clipboard } from '@skeletonlabs/skeleton';
	import { encodeMessage, encodeImage, initWasm } from '$lib/ghostpost';
	import { authStore } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	// Mode toggle
	let useAI = false;

	// AI mode fields
	let prompt = '';
	let platform: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' = 'twitter';

	// Common fields
	let visibleMessage = '';
	let secretMessage = '';
	let secretType: 'text' | 'image' = 'text';
	let secretImage: File | null = null;
	let imagePreview = '';

	// Output
	let encodedMessage = '';
	let currentPostId = '';

	// State
	let isGenerating = false;
	let isEncoding = false;
	let error = '';
	let currentStep = 1;

	onMount(async () => {
		await initWasm();
	});

	$: user = $authStore.user;

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
				currentStep = 2;
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
			secretMessage = '';
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

			// Save to user's account if logged in
			if (user) {
				try {
					await supabase.from('posts').insert({
						user_id: user.id,
						post_id: currentPostId,
						content: encodedMessage,
						platform: platform,
						visible_message: visibleMessage,
						secret_message: secretType === 'text' ? secretMessage : 'image',
						secret_type: secretType
					});
				} catch (dbError) {
					console.error('Failed to save to database:', dbError);
					// Don't show error to user, post is still encoded
				}
			}

			currentStep = 3;
			error = '';
		} catch (err) {
			error = 'Failed to encode message';
			console.error(err);
		} finally {
			isEncoding = false;
		}
	}

	function skipToManual() {
		visibleMessage = '';
		currentStep = 2;
	}

	function reset() {
		prompt = '';
		visibleMessage = '';
		secretMessage = '';
		secretImage = null;
		imagePreview = '';
		encodedMessage = '';
		currentPostId = '';
		error = '';
		currentStep = 1;
	}
</script>

<svelte:head>
	<title>Compose - GhostPost</title>
</svelte:head>

<AuthGuard>
<div class="container mx-auto p-8 max-w-5xl space-y-6">
	<!-- Header -->
	<div class="text-center space-y-4">
		<h1 class="h1">✍️ Compose a GhostPost</h1>
		<p class="text-lg opacity-75">
			Create a message with a hidden secret that only special tools can reveal
		</p>
	</div>

	<!-- AI Mode Toggle -->
	<div class="card p-6 variant-ghost-primary">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div class="flex-1">
				<h3 class="h3 mb-2">Need help writing your post?</h3>
				<p class="text-sm opacity-75">
					Use AI to generate platform-optimized content, or write your own message
				</p>
			</div>
			<label class="flex items-center gap-3">
				<span class="text-sm font-bold">AI Mode</span>
				<input type="checkbox" class="toggle" bind:checked={useAI} />
			</label>
		</div>
	</div>

	<!-- Step 1: Create/Generate Visible Message -->
	{#if currentStep === 1}
		<div class="card p-6 space-y-4">
			<div class="flex items-center gap-2 mb-2">
				<span class="badge variant-filled-primary">Step 1</span>
				<h2 class="h2">Create Your Visible Message</h2>
			</div>

			{#if useAI}
				<!-- AI Generation Mode -->
				<div class="space-y-4">
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

					<div class="flex gap-4">
						<button
							class="btn variant-filled-primary"
							on:click={generateContent}
							disabled={isGenerating || !prompt.trim()}
						>
							{#if isGenerating}
								<span>⏳ Generating...</span>
							{:else}
								<span>✨ Generate with AI</span>
							{/if}
						</button>
						<button class="btn variant-ghost-surface" on:click={skipToManual}>
							Skip AI - Write Manually
						</button>
					</div>
				</div>
			{:else}
				<!-- Manual Mode -->
				<div class="space-y-4">
					<label class="label">
						<span>Write your visible message</span>
						<textarea
							class="textarea"
							rows="5"
							bind:value={visibleMessage}
							placeholder="Enter the message everyone will see..."
						/>
					</label>

					<button
						class="btn variant-filled-primary"
						on:click={() => (currentStep = 2)}
						disabled={!visibleMessage.trim()}
					>
						Continue to Secret →
					</button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Step 2: Add Secret Message -->
	{#if currentStep === 2}
		<div class="card p-6 space-y-4">
			<div class="flex items-center gap-2 mb-2">
				<span class="badge variant-filled-secondary">Step 2</span>
				<h2 class="h2">Add Your Secret</h2>
			</div>

			<label class="label">
				<span>Visible Message (edit if needed)</span>
				<textarea class="textarea" rows="4" bind:value={visibleMessage} />
			</label>

			<label class="label">
				<span>Secret Type</span>
				<select class="select" bind:value={secretType}>
					<option value="text">Text Message</option>
					<option value="image">Image File</option>
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
					<span>Secret Image</span>
					<input type="file" accept="image/*" class="file-input" on:change={handleSecretFile} />
					{#if imagePreview}
						<div class="mt-2">
							<img
								src={imagePreview}
								alt="Preview"
								class="max-w-xs max-h-48 object-contain rounded"
							/>
						</div>
					{/if}
				</label>
			{/if}

			<div class="flex gap-4">
				<button
					class="btn variant-filled-primary"
					on:click={handleEncode}
					disabled={isEncoding ||
						!visibleMessage.trim() ||
						(secretType === 'text' && !secretMessage.trim()) ||
						(secretType === 'image' && !secretImage)}
				>
					{#if isEncoding}
						<span>🔒 Encoding...</span>
					{:else}
						<span>🔒 Encode Secret</span>
					{/if}
				</button>
				<button class="btn variant-ghost-surface" on:click={() => (currentStep = 1)}>
					← Back
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 3: Copy & Share -->
	{#if currentStep === 3 && encodedMessage}
		<div class="card p-6 space-y-4 variant-glass-primary">
			<div class="flex items-center gap-2 mb-2">
				<span class="badge variant-filled-success">Step 3</span>
				<h2 class="h2">✅ Your GhostPost is Ready!</h2>
			</div>

			{#if user}
				<div class="card p-4 variant-ghost-success">
					<p class="text-sm font-bold">✨ Saved to Your Account</p>
					<p class="text-xs opacity-75 mt-1">
						Post ID: <code class="code">{currentPostId}</code>
					</p>
					<p class="text-xs opacity-75 mt-2">
						View your posts and analytics on the <a href="/dashboard" class="anchor"
							>My Posts page</a
						>
					</p>
				</div>
			{:else}
				<div class="card p-4 variant-ghost-warning">
					<p class="text-sm font-bold">💡 Tip: Sign In to Save</p>
					<p class="text-xs opacity-75 mt-1">
						Sign in to automatically save your posts and track analytics
					</p>
				</div>
			{/if}

			<label class="label">
				<span>Encoded Message (copy and paste anywhere)</span>
				<textarea
					class="textarea"
					rows="5"
					readonly
					data-clipboard="encoded"
					value={encodedMessage}
				/>
			</label>

			<div class="flex gap-4 flex-wrap">
				<button class="btn variant-filled-primary" use:clipboard={{ input: 'encoded' }}>
					📋 Copy to Clipboard
				</button>
				<button class="btn variant-filled-secondary" on:click={reset}>
					✨ Create Another
				</button>
				{#if user}
					<a href="/dashboard" class="btn variant-ghost-surface"> 📊 View My Posts </a>
				{/if}
			</div>

			<div class="card p-4 variant-ghost-surface">
				<h3 class="h3 mb-2 text-sm">📤 Next Steps</h3>
				<ol class="list-decimal list-inside space-y-1 text-sm">
					<li>Copy the encoded message above</li>
					<li>Paste it on your social media platform (Twitter, LinkedIn, etc.)</li>
					<li>It looks like a normal message but contains your hidden secret!</li>
					<li>Share the decode link with those who should see the secret</li>
				</ol>
			</div>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="card p-4 variant-ghost-error">
			<p>❌ {error}</p>
		</div>
	{/if}

	<!-- How It Works -->
	<div class="card p-6 variant-ghost-surface">
		<h3 class="h3 mb-4">💡 How GhostPost Works</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="space-y-2">
				<div class="text-3xl">✍️</div>
				<h4 class="h4 text-sm">1. Compose</h4>
				<p class="text-xs opacity-75">
					Write or generate your message with AI, then add a secret only you want certain people to
					see
				</p>
			</div>
			<div class="space-y-2">
				<div class="text-3xl">🔒</div>
				<h4 class="h4 text-sm">2. Encode</h4>
				<p class="text-xs opacity-75">
					Your secret is hidden using invisible Unicode characters - looks normal but contains
					hidden data
				</p>
			</div>
			<div class="space-y-2">
				<div class="text-3xl">🌐</div>
				<h4 class="h4 text-sm">3. Share</h4>
				<p class="text-xs opacity-75">
					Post anywhere - Twitter, LinkedIn, Messages. Recipients decode it at <a
						href="/decode"
						class="anchor">/decode</a
					>
				</p>
			</div>
		</div>
	</div>
</div>
</AuthGuard>
