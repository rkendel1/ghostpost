<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createSecureNote,
		createSecureNoteMessage,
		checkNoteStatus
	} from '$lib/secure-notes-service';
	import type { NoteExpiryType } from '$lib/types/secure-notes';

	let content = '';
	let visibleMessage = '';
	let password = '';
	let confirmPassword = '';
	let expiryType: NoteExpiryType = 'time-based';
	let expiryMinutes = 24 * 60; // 24 hours default
	let requirePassword = false;
	let singleRevealOnly = false;

	let isCreating = false;
	let error = '';
	let success = false;
	let encodedMessage = '';
	let currentNoteId = '';

	const expiryOptions = [
		{ value: 'never', label: '⏰ Never Expire' },
		{ value: 'time-based', label: '⏳ Time-based' },
		{ value: 'single-reveal', label: '👁️ Single Reveal Only' }
	];

	const timeOptions = [
		{ value: 15, label: '15 minutes' },
		{ value: 60, label: '1 hour' },
		{ value: 24 * 60, label: '24 hours' },
		{ value: 7 * 24 * 60, label: '7 days' },
		{ value: 30 * 24 * 60, label: '30 days' }
	];

	async function handleCreateNote() {
		// Validation
		if (!content.trim()) {
			error = 'Please enter your secret content';
			return;
		}

		if (!visibleMessage.trim()) {
			error = 'Please enter a visible message to wrap the secret in';
			return;
		}

		if (requirePassword) {
			if (!password) {
				error = 'Please enter a password';
				return;
			}
			if (password !== confirmPassword) {
				error = 'Passwords do not match';
				return;
			}
			if (password.length < 6) {
				error = 'Password must be at least 6 characters';
				return;
			}
		}

		isCreating = true;
		error = '';
		success = false;

		try {
			// Create the note
			const createResult = await createSecureNote(
				content,
				{
					expiryType,
					expiryMinutes: expiryType === 'time-based' ? expiryMinutes : undefined,
					requirePassword,
					singleRevealOnly,
					allowSharing: true
				},
				undefined,
				undefined
			);

			if (!createResult.success || !createResult.noteId) {
				error = createResult.error || 'Failed to create note';
				return;
			}

			currentNoteId = createResult.noteId;

			// Create the message with the note reference
			const messageResult = await createSecureNoteMessage(
				visibleMessage,
				createResult.noteId,
				requirePassword ? password : undefined
			);

			if (!messageResult.success || !messageResult.encoded) {
				error = messageResult.error || 'Failed to encode message';
				return;
			}

			encodedMessage = messageResult.encoded;
			success = true;
		} catch (err) {
			error = String(err);
			console.error(err);
		} finally {
			isCreating = false;
		}
	}

	function handleClear() {
		content = '';
		visibleMessage = '';
		password = '';
		confirmPassword = '';
		encodedMessage = '';
		currentNoteId = '';
		error = '';
		success = false;
		expiryType = 'time-based';
		expiryMinutes = 24 * 60;
		requirePassword = false;
		singleRevealOnly = false;
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			// TODO: Show toast notification
			alert('Copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="secure-note-composer card p-6 space-y-6 variant-ghost-primary">
	<div class="flex justify-between items-center">
		<h2 class="h2">🔐 Create Secure Note</h2>
		<button class="btn btn-sm variant-ghost" on:click={handleClear} disabled={isCreating}>
			Clear All
		</button>
	</div>

	{#if error}
		<div class="card p-3 variant-ghost-error">
			<p class="text-sm">❌ {error}</p>
		</div>
	{/if}

	{#if success && encodedMessage}
		<div class="card p-4 space-y-3 variant-ghost-success">
			<div class="space-y-2">
				<p class="font-bold">✨ Your Secure Note is Ready!</p>
				<p class="text-sm opacity-75">
					Share this encoded message with anyone. Only those who reveal it will see the secret content.
				</p>
			</div>

			<label class="label">
				<span>Encoded Message (Copy & Share)</span>
				<textarea
					class="textarea"
					rows="4"
					readonly
					value={encodedMessage}
				/>
			</label>

			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary flex-1"
					on:click={() => copyToClipboard(encodedMessage)}
				>
					📋 Copy to Clipboard
				</button>
				<button
					class="btn variant-ghost flex-1"
					on:click={handleClear}
				>
					➕ Create Another
				</button>
			</div>

			<div class="text-xs opacity-75 space-y-1">
				<p>🔑 Note ID: <code class="text-xs">{currentNoteId}</code></p>
				<p>🔒 The content is encrypted client-side. Only you have the decryption key.</p>
				<p>
					💬 Share the encoded message anywhere - social media, email, DM, etc. The secret stays hidden
					until revealed.
				</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			<!-- Secret Content -->
			<div>
				<label class="label">
					<span class="font-bold">Your Secret Content</span>
					<textarea
						class="textarea"
						rows="5"
						bind:value={content}
						placeholder="Enter the text you want to keep secret... (up to 10,000 characters)"
						maxlength="10000"
						disabled={isCreating}
					/>
					<div class="text-xs opacity-50 mt-1">
						{content.length} / 10,000 characters
					</div>
				</label>
			</div>

			<!-- Visible Message -->
			<div>
				<label class="label">
					<span class="font-bold">Visible Message</span>
					<p class="text-sm opacity-75 mb-2">
						This message will be visible to everyone. The secret is hidden inside.
					</p>
					<textarea
						class="textarea"
						rows="3"
						bind:value={visibleMessage}
						placeholder="e.g., 'Check this out!' or 'You won't believe this...'"
						disabled={isCreating}
					/>
				</label>
			</div>

			<!-- Security Configuration -->
			<div class="card p-4 variant-ghost-surface space-y-4">
				<p class="font-bold text-sm">🔒 Security Settings</p>

				<!-- Expiry Type -->
				<div>
					<label class="label">
						<span>When should this note expire?</span>
						<select class="select" bind:value={expiryType} disabled={isCreating}>
							{#each expiryOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</label>
				</div>

				<!-- Time-based Expiry -->
				{#if expiryType === 'time-based'}
					<div>
						<label class="label">
							<span>Expiry Time</span>
							<select class="select" bind:value={expiryMinutes} disabled={isCreating}>
								{#each timeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</label>
					</div>
				{/if}

				<!-- Single Reveal -->
				{#if expiryType === 'single-reveal'}
					<div class="text-sm opacity-75">
						⚠️ This note will be automatically deleted after being revealed once.
					</div>
				{/if}

				<!-- Password Protection -->
				<div class="space-y-2">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							class="checkbox"
							bind:checked={requirePassword}
							disabled={isCreating}
						/>
						<span class="text-sm">Require Password to Reveal</span>
					</label>

					{#if requirePassword}
						<div class="space-y-2">
							<label class="label">
								<span class="text-sm">Password</span>
								<input
									type="password"
									class="input"
									bind:value={password}
									placeholder="Enter a password"
									disabled={isCreating}
									minlength="6"
								/>
							</label>
							<label class="label">
								<span class="text-sm">Confirm Password</span>
								<input
									type="password"
									class="input"
									bind:value={confirmPassword}
									placeholder="Confirm password"
									disabled={isCreating}
									minlength="6"
								/>
							</label>
						</div>
					{/if}
				</div>

				<!-- Single Reveal Only (as toggle option) -->
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						class="checkbox"
						bind:checked={singleRevealOnly}
						disabled={isCreating || expiryType === 'single-reveal'}
					/>
					<span class="text-sm">Delete after first reveal (in addition to time-based expiry)</span>
				</label>
			</div>

			<!-- Create Button -->
			<button
				class="btn variant-filled-primary w-full"
				on:click={handleCreateNote}
				disabled={isCreating || !content.trim() || !visibleMessage.trim()}
			>
				{#if isCreating}
					<span>⏳ Creating...</span>
				{:else}
					<span>🔐 Create Secure Note</span>
				{/if}
			</button>
		</div>
	{/if}

	<div class="card p-4 variant-ghost-surface text-sm space-y-2">
		<p class="font-bold">💡 How It Works</p>
		<ul class="list-disc list-inside space-y-1 opacity-75">
			<li>
				Your content is encrypted
				<strong>client-side</strong> before being stored
			</li>
			<li>The visible message hides the secret inside invisible characters</li>
			<li>Only people who decode the message will see the secret</li>
			<li>
				You control when and how the secret expires - time-based, single-reveal, or never
			</li>
			<li>Optional password adds an extra layer of security</li>
		</ul>
	</div>
</div>

<style lang="postcss">
	.secure-note-composer {
		border: 2px solid var(--color-primary-500);
	}
</style>
