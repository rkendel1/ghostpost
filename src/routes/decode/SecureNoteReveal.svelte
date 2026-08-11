<script lang="ts">
	import { onMount } from 'svelte';
	import {
		extractSecureNoteFromText,
		checkNoteStatus,
		revealSecureNote
	} from '$lib/secure-notes-service';

	export let text: string;
	export let onClose: () => void;

	let noteId: string | null = null;
	let password: string = '';
	let isChecking = false;
	let isRevealing = false;
	let error = '';
	let success = false;
	let revealedContent = '';
	let noteStatus: any = null;
	let requiresPassword = false;
	let passwordProvided = false;

	onMount(async () => {
		// Extract note reference from text
		const extractResult = await extractSecureNoteFromText(text);
		if (extractResult.success && extractResult.noteId) {
			noteId = extractResult.noteId;
			password = extractResult.password || '';

			// Check note status
			isChecking = true;
			const statusResult = await checkNoteStatus(noteId);
			isChecking = false;

			if (statusResult.success) {
				noteStatus = statusResult.status;
				if (statusResult.isExpired) {
					error = '⏰ This note has expired and can no longer be revealed.';
				}
			}
		} else {
			error = 'No secure note found in this text.';
		}
	});

	async function handleReveal() {
		if (!noteId) return;

		isRevealing = true;
		error = '';
		success = false;

		try {
			const result = await revealSecureNote(noteId, passwordProvided ? password : undefined);

			if (!result.success) {
				if (result.requiresPassword) {
					requiresPassword = true;
					error = '🔐 This note requires a password to reveal.';
				} else {
					error = result.error || 'Failed to reveal note';
				}
				return;
			}

			revealedContent = result.content || '';
			success = true;
		} catch (err) {
			error = 'Failed to decrypt note: ' + String(err);
			console.error(err);
		} finally {
			isRevealing = false;
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			alert('Copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function handleClear() {
		noteId = null;
		password = '';
		error = '';
		success = false;
		revealedContent = '';
		noteStatus = null;
		requiresPassword = false;
		passwordProvided = false;
	}
</script>

<div class="secure-note-reveal card p-6 space-y-4 variant-ghost-primary">
	<div class="flex justify-between items-center mb-4">
		<h3 class="h3">🔐 Secure Note</h3>
		<button class="btn btn-sm variant-ghost" on:click={onClose}>
			✕ Close
		</button>
	</div>

	{#if isChecking}
		<div class="text-center space-y-3">
			<div class="text-4xl animate-spin">⏳</div>
			<p class="opacity-75">Checking note status...</p>
		</div>
	{:else if error}
		<div class="card p-4 variant-ghost-error">
			<p class="text-sm">{error}</p>
			{#if !error.includes('expired')}
				<button
					class="btn btn-sm variant-ghost mt-3"
					on:click={handleClear}
				>
					Try Another
				</button>
			{/if}
		</div>
	{:else if success && revealedContent}
		<div class="card p-4 space-y-3 variant-ghost-success">
			<p class="font-bold">✨ Secret Revealed!</p>

			<div class="bg-surface-800 rounded p-3 max-h-96 overflow-y-auto">
				<p class="text-sm whitespace-pre-wrap break-words">{revealedContent}</p>
			</div>

			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary flex-1"
					on:click={() => copyToClipboard(revealedContent)}
				>
					📋 Copy Secret
				</button>
				<button
					class="btn variant-ghost flex-1"
					on:click={handleClear}
				>
					↺ Close
				</button>
			</div>

			<div class="text-xs opacity-75 space-y-1">
				{#if noteStatus}
					<p>📊 This note has been revealed {noteStatus.revealCount} times</p>
					{#if noteStatus.expiryType === 'single-reveal'}
						<p>🔥 This note is now expired (single-reveal only)</p>
					{:else if noteStatus.expiryType === 'time-based' && noteStatus.expiresAt}
						<p>⏰ Expires at: {new Date(noteStatus.expiresAt).toLocaleString()}</p>
					{/if}
				{/if}
			</div>
		</div>
	{:else if requiresPassword && !passwordProvided}
		<div class="space-y-4">
			<p class="text-sm opacity-75">
				🔐 This note is password-protected. Enter the password to reveal it.
			</p>

			<label class="label">
				<span>Password</span>
				<input
					type="password"
					class="input"
					bind:value={password}
					placeholder="Enter the note password..."
					disabled={isRevealing}
				/>
			</label>

			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary flex-1"
					on:click={() => {
						passwordProvided = true;
						handleReveal();
					}}
					disabled={isRevealing || !password}
				>
					{#if isRevealing}
						⏳ Revealing...
					{:else}
						🔓 Reveal with Password
					{/if}
				</button>
				<button
					class="btn variant-ghost flex-1"
					on:click={onClose}
					disabled={isRevealing}
				>
					Cancel
				</button>
			</div>
		</div>
	{:else if noteId && noteStatus && !noteStatus.isExpired}
		<div class="space-y-4">
			<div class="card p-3 variant-ghost-surface">
				<p class="text-sm">
					<strong>Status:</strong>
					{#if noteStatus.expiryType === 'single-reveal'}
						👁️ Single-reveal (expires after opening)
					{:else if noteStatus.expiryType === 'time-based'}
						⏳ Time-limited (expires at {new Date(noteStatus.expiresAt).toLocaleString()})
					{:else}
						♾️ Never expires
					{/if}
				</p>
				<p class="text-sm mt-1">
					<strong>Revealed:</strong>
					{noteStatus.revealCount}
					{noteStatus.revealCount === 1 ? 'time' : 'times'}
				</p>
			</div>

			<button
				class="btn variant-filled-primary w-full"
				on:click={handleReveal}
				disabled={isRevealing}
			>
				{#if isRevealing}
					⏳ Revealing...
				{:else}
					🔓 Reveal Secret
				{/if}
			</button>

			<button
				class="btn variant-ghost w-full"
				on:click={onClose}
				disabled={isRevealing}
			>
				Cancel
			</button>
		</div>
	{/if}

	<div class="text-xs opacity-50 space-y-1">
		<p>🔒 Content is decrypted client-side in your browser</p>
		<p>🚫 The sender has no way to see what you do with the revealed secret</p>
	</div>
</div>

<style lang="postcss">
	.secure-note-reveal {
		border: 2px solid var(--color-primary-500);
	}
</style>
