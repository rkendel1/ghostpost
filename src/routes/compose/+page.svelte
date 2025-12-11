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

	// Limited reveals feature
	let maxReveals: number | null = null;
	let enableLimitedReveals = false;

	// Output
	let encodedMessage = '';
	let currentPostId = '';
	let characterStats = { visibleLength: 0, hiddenLength: 0, totalLength: 0 };

	// State
	let isGenerating = false;
	let isEncoding = false;
	let error = '';

	// Computed properties
	$: isEncodeDisabled =
		isEncoding ||
		!visibleMessage.trim() ||
		(secretType === 'text' && !secretMessage.trim()) ||
		(secretType === 'image' && !secretImage);

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
			characterStats = {
				visibleLength: result.visibleLength,
				hiddenLength: result.hiddenLength,
				totalLength: result.totalLength
			};

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

					// Initialize limited reveals if enabled
					if (enableLimitedReveals && maxReveals && maxReveals > 0) {
						try {
							const response = await fetch('/api/limited-reveals/init', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									post_id: currentPostId,
									max_reveals: maxReveals,
									user_id: user.id
								})
							});

							const data = await response.json();
							if (!data.success) {
								console.error('Failed to initialize limited reveals:', data.error);
							}
						} catch (limitError) {
							console.error('Failed to initialize limited reveals:', limitError);
						}
					}
				} catch (dbError) {
					console.error('Failed to save to database:', dbError);
					error =
						'Post encoded successfully, but failed to save to your account. You can still use the encoded message.';
				}
			}

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
	}

	function reset() {
		prompt = '';
		visibleMessage = '';
		secretMessage = '';
		secretImage = null;
		imagePreview = '';
		encodedMessage = '';
		currentPostId = '';
		characterStats = { visibleLength: 0, hiddenLength: 0, totalLength: 0 };
		error = '';
		enableLimitedReveals = false;
		maxReveals = null;
	}
</script>

<svelte:head>
	<title>Compose - GhostPost</title>
</svelte:head>

<AuthGuard>
	<div class="container mx-auto p-4 lg:p-8 max-w-7xl space-y-6">
		<!-- Header -->
		<div class="text-center space-y-4">
			<h1 class="h1">✍️ Compose a GhostPost</h1>
			<p class="text-lg opacity-75">
				Create a message with a hidden secret that only special tools can reveal
			</p>
		</div>

		<!-- AI Mode Toggle -->
		<div class="card p-4 lg:p-6 variant-ghost-primary">
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

		<!-- Main Content: Side by Side Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Left Panel: Message Composition -->
			<div class="space-y-6">
				<!-- Step 1: Create/Generate Visible Message -->
				<div class="card p-4 lg:p-6 space-y-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="badge variant-filled-primary">Step 1</span>
						<h2 class="h2 text-xl">Create Your Visible Message</h2>
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
								></textarea>
							</label>

							<div class="flex gap-4 flex-wrap">
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
								<button class="btn variant-ghost-surface text-sm" on:click={skipToManual}>
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
								></textarea>
							</label>
						</div>
					{/if}
				</div>

				<!-- Step 2: Add Secret Message -->
				<div class="card p-4 lg:p-6 space-y-4">
					<div class="flex items-center gap-2 mb-2">
						<span class="badge variant-filled-secondary">Step 2</span>
						<h2 class="h2 text-xl">Add Your Secret</h2>
					</div>

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
								rows="4"
								bind:value={secretMessage}
								placeholder="Enter your secret message here..."
							></textarea>
						</label>
					{:else}
						<label class="label">
							<span>Secret Image</span>
							<p class="text-sm opacity-75 mb-2">
								⚠️ For best results, use images under 100KB. Large images will be automatically
								resized and compressed to prevent crashes on mobile devices.
							</p>
							<input type="file" accept="image/*" class="file-input" on:change={handleSecretFile} />
							{#if imagePreview}
								<div class="mt-2">
									<img
										src={imagePreview}
										alt="Preview"
										class="max-w-xs max-h-48 object-contain rounded"
									/>
									{#if secretImage}
										<p class="text-xs opacity-75 mt-1">
											Size: {(secretImage.size / 1024).toFixed(1)} KB
											{#if secretImage.size > 100 * 1024}
												<span class="text-warning-500"
													>(will be compressed to ~100KB for encoding)</span
												>
											{/if}
										</p>
									{/if}
								</div>
							{/if}
						</label>
					{/if}

					<!-- Limited Reveals Feature -->
					<div class="card p-4 variant-ghost-tertiary space-y-3">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="font-bold text-sm">🔥 Limited Edition Secret (FOMO Mode)</h3>
								<p class="text-xs opacity-75 mt-1">
									Set a reveal cap to create extreme scarcity — like NFT drops but for secrets!
								</p>
							</div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									class="checkbox"
									bind:checked={enableLimitedReveals}
								/>
								<span class="text-xs">Enable</span>
							</label>
						</div>

						{#if enableLimitedReveals}
							<label class="label">
								<span class="text-sm">Max Reveals (e.g., 100 = only 100 people can ever see this)</span>
								<input
									type="number"
									class="input"
									min="1"
									max="10000"
									bind:value={maxReveals}
									placeholder="Enter number (e.g., 100)"
								/>
								{#if maxReveals && maxReveals > 0}
									<p class="text-xs opacity-75 mt-1">
										⚠️ Once {maxReveals} {maxReveals === 1 ? 'person reveals' : 'people reveal'} this secret,
										it will be permanently unreadable for everyone else!
									</p>
								{/if}
							</label>

							<div class="card p-3 variant-ghost-warning">
								<p class="text-xs">
									<strong>💎 What happens:</strong><br/>
									• Real-time counter shows "You are reveal #X of {maxReveals || 'Y'}"<br/>
									• Pulsing red warning when &lt;20% remaining<br/>
									• Confetti celebration for last few reveals<br/>
									• Message becomes "SOLD OUT FOREVER" when limit reached
								</p>
							</div>
						{/if}
					</div>

					<button
						class="btn variant-filled-primary w-full"
						on:click={handleEncode}
						disabled={isEncodeDisabled}
					>
						{#if isEncoding}
							<span>🔒 Encoding...</span>
						{:else}
							<span>🔒 Encode Secret</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Right Panel: Preview & Output -->
			<div class="space-y-6">
				<!-- Preview / Output -->
				{#if encodedMessage}
					<!-- Step 3: Copy & Share -->
					<div class="card p-4 lg:p-6 space-y-4 variant-glass-success">
						<div class="flex items-center gap-2 mb-2">
							<span class="badge variant-filled-success">Step 3</span>
							<h2 class="h2 text-xl">✅ Your GhostPost is Ready!</h2>
						</div>

						{#if user}
							<div class="card p-4 variant-ghost-success">
								<p class="text-sm font-bold">✨ Saved to Your Account</p>
								<p class="text-xs opacity-75 mt-1">
									Post ID: <code class="code text-xs">{currentPostId}</code>
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
								rows="6"
								readonly
								data-clipboard="encoded"
								value={encodedMessage}
							></textarea>
						</label>

						<div class="card p-4 variant-ghost-surface">
							<h3 class="h3 mb-2 text-sm">📊 Character Count</h3>
							<div class="text-sm space-y-1">
								<p>Visible message: <strong>{characterStats.visibleLength}</strong> characters</p>
								<p>Hidden characters: <strong>{characterStats.hiddenLength}</strong> characters</p>
								<p>Total length: <strong>{characterStats.totalLength}</strong> characters</p>
							</div>
							{#if characterStats.totalLength > 40000}
								<div class="mt-2 text-warning-500 text-sm font-bold">
									⚠️ Warning: Message exceeds 40,000 characters and may not be accepted on some platforms
								</div>
							{:else if characterStats.totalLength > 10000}
								<div class="mt-2 text-secondary-500 text-sm">
									ℹ️ Note: Some platforms have character limits. Twitter/X allows ~280 characters.
								</div>
							{/if}
						</div>

						<div class="flex gap-2 flex-wrap">
							<button
								class="btn variant-filled-primary flex-1"
								use:clipboard={{ input: 'encoded' }}
							>
								📋 Copy
							</button>
							<button class="btn variant-filled-secondary flex-1" on:click={reset}> ✨ New </button>
						</div>

						<div class="card p-4 variant-ghost-surface">
							<h3 class="h3 mb-2 text-sm">📤 Next Steps</h3>
							<ol class="list-decimal list-inside space-y-1 text-sm">
								<li>Copy the encoded message above</li>
								<li>Paste it on social media (Twitter, LinkedIn, etc.)</li>
								<li>It looks normal but contains your hidden secret!</li>
								<li>Share the decode link with recipients</li>
							</ol>
						</div>
					</div>
				{:else}
					<!-- Message Preview -->
					<div class="card p-4 lg:p-6 space-y-4">
						<h2 class="h2 text-xl">📝 Preview</h2>

						{#if visibleMessage.trim()}
							<div class="space-y-3">
								<div>
									<h3 class="font-bold text-sm mb-1">Visible Message:</h3>
									<div class="card p-4 variant-ghost-surface">
										<p class="text-sm whitespace-pre-wrap">{visibleMessage}</p>
									</div>
								</div>

								{#if secretMessage.trim() || imagePreview}
									<div>
										<h3 class="font-bold text-sm mb-1">Secret Content:</h3>
										<div class="card p-4 variant-ghost-secondary">
											{#if secretType === 'text' && secretMessage.trim()}
												<p class="text-sm whitespace-pre-wrap">{secretMessage}</p>
											{:else if imagePreview}
												<img
													src={imagePreview}
													alt="Secret"
													class="max-w-full max-h-32 object-contain rounded"
												/>
											{/if}
										</div>
									</div>
								{/if}

								<div class="card p-3 variant-ghost-primary">
									<p class="text-xs opacity-75">
										👆 Ready to encode? Click "Encode Secret" to create your GhostPost!
									</p>
								</div>
							</div>
						{:else}
							<div class="card p-8 variant-ghost-surface text-center">
								<p class="text-sm opacity-50">Your message preview will appear here...</p>
							</div>
						{/if}
					</div>

					<!-- Test Encoding Info -->
					<div class="card p-4 variant-ghost-surface">
						<h3 class="h3 mb-2 text-sm">🧪 Test Your Encoding</h3>
						<p class="text-xs opacity-75">
							Once encoded, you can test by pasting the result on the
							<a href="/decode" class="anchor">Decode page</a> to verify the hidden message.
						</p>
					</div>
				{/if}
			</div>
		</div>

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
						Write or generate your message with AI, then add a secret only you want certain people
						to see
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
