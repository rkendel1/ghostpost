<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { AIPromptPayload, ConversationState } from '$lib/ai-service';
	import {
		initializeConversation,
		sendMessage,
		getConversation,
		saveConversation,
		clearConversation,
		generateAdaptiveContent,
		detectContext
	} from '$lib/ai-service';

	export let payload: AIPromptPayload;
	export let postId: string;
	export let onClose: () => void;

	let conversation: ConversationState | undefined;
	let userInput = '';
	let isLoading = false;
	let error = '';
	let autoScroll = true;
	let scrollContainer: HTMLDivElement;

	onMount(async () => {
		try {
			// Check if conversation already exists
			conversation = getConversation(postId);

			// If not, initialize new conversation
			if (!conversation) {
				conversation = await initializeConversation(payload, postId);
			}

			// Auto-scroll to bottom
			setTimeout(() => scrollToBottom(), 100);
		} catch (err) {
			error = 'Failed to initialize conversation';
			console.error(err);
		}
	});

	onDestroy(async () => {
		// Save conversation state before unmounting
		if (conversation) {
			await saveConversation(postId);
		}
	});

	async function handleSendMessage() {
		if (!userInput.trim() || isLoading) return;

		const message = userInput.trim();
		userInput = '';
		isLoading = true;
		error = '';

		try {
			if (!conversation) throw new Error('Conversation not initialized');

			// Send message and get response
			const response = await sendMessage(postId, message);

			// Update UI (conversation is updated by sendMessage)
			conversation = getConversation(postId);

			await saveConversation(postId);
			scrollToBottom();
		} catch (err) {
			error = String(err);
			console.error(err);
		} finally {
			isLoading = false;
		}
	}

	function scrollToBottom() {
		if (scrollContainer && autoScroll) {
			setTimeout(() => {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}, 0);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	}

	function clearChat() {
		if (confirm('Clear conversation history?')) {
			clearConversation(postId);
			conversation = undefined;
		}
	}
</script>

<div class="chatbot-reveal card p-6 space-y-4 variant-ghost-primary">
	<div class="flex justify-between items-center mb-4">
		<h3 class="h3">💬 Conversational Secret</h3>
		<div class="space-x-2">
			<button class="btn btn-sm variant-ghost" on:click={clearChat}>
				🔄 Clear
			</button>
			<button class="btn btn-sm variant-ghost" on:click={onClose}>
				✕ Close
			</button>
		</div>
	</div>

	{#if error}
		<div class="card p-3 variant-ghost-error">
			<p class="text-sm">❌ {error}</p>
		</div>
	{/if}

	{#if conversation}
		<div
			bind:this={scrollContainer}
			class="conversation-history bg-surface-800 rounded p-4 space-y-3 max-h-96 overflow-y-auto"
		>
			{#each conversation.messages as message (message.timestamp)}
				{#if message.role !== 'system'}
					<div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
						<div class="message-badge">
							{#if message.role === 'user'}
								👤
							{:else}
								🤖
							{/if}
						</div>
						<div class="message-content">
							<p class="text-sm">{message.content}</p>
							{#if message.timestamp}
								<p class="text-xs opacity-50 mt-1">
									{new Date(message.timestamp).toLocaleTimeString()}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/each}

			{#if isLoading}
				<div class="message assistant">
					<div class="message-badge">🤖</div>
					<div class="message-content">
						<p class="text-sm">⏳ Thinking...</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="input-area space-y-2">
			<textarea
				class="textarea"
				rows="2"
				bind:value={userInput}
				placeholder="Type your message..."
				on:keydown={handleKeydown}
				disabled={isLoading}
			/>
			<div class="flex gap-2">
				<button
					class="btn variant-filled-primary flex-1"
					on:click={handleSendMessage}
					disabled={isLoading || !userInput.trim()}
				>
					{isLoading ? '⏳ Sending...' : '📤 Send'}
				</button>
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" class="checkbox" bind:checked={autoScroll} />
					<span class="text-sm">Auto-scroll</span>
				</label>
			</div>
		</div>

		<div class="text-xs opacity-50 space-y-1">
			<p>💡 Tip: This conversation is saved locally and persisted across sessions.</p>
			<p>🔐 Privacy: Responses are generated locally or through your configured AI provider.</p>
		</div>
	{/if}
</div>

<style lang="postcss">
	.conversation-history {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.message {
		display: flex;
		gap: 0.75rem;
		animation: slideIn 0.3s ease-out;
	}

	.message.user {
		flex-direction: row-reverse;
	}

	.message-badge {
		font-size: 1.25rem;
		flex-shrink: 0;
		width: 2rem;
		text-align: center;
	}

	.message-content {
		flex: 1;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: var(--color-surface-700);
	}

	.message.user .message-content {
		background: var(--color-primary-600);
		color: white;
	}

	.message.assistant .message-content {
		background: var(--color-surface-600);
	}

	@keyframes slideIn {
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
