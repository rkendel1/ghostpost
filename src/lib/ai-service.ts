/**
 * AI Service Layer for Ghostpost
 * Handles conversational secrets, adaptive reveals, and story generation
 * Uses WebLLM for local model inference (privacy-preserving)
 */

import { v4 as uuidv4 } from 'uuid';

// AI type constants - must match WASM
export const AI_TYPE_CHATBOT = 0x00;
export const AI_TYPE_POET = 0x01;
export const AI_TYPE_ANALYST = 0x02;
export const AI_TYPE_STORYTELLER = 0x03;

export interface AIPromptPayload {
	aiType: string; // 'chatbot' | 'poet' | 'analyst' | 'storyteller'
	basePrompt: string;
	systemMessage?: string;
	metadata?: string;
}

export interface ConversationMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
}

export interface ConversationState {
	postId: string;
	aiType: string;
	messages: ConversationMessage[];
	modelUsed: string;
	createdAt: number;
	lastModified: number;
}

export interface ContentContext {
	platform?: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'generic';
	userRole?: 'creator' | 'business' | 'creative' | 'analyst' | 'general';
	tone?: 'professional' | 'casual' | 'creative' | 'technical';
	language?: string;
	additionalContext?: Record<string, any>;
}

// In-memory store for conversation state (can be extended with persistence)
const conversationStore = new Map<string, ConversationState>();

// Default system messages for different AI types
const DEFAULT_SYSTEM_MESSAGES = {
	chatbot:
		'You are a helpful, curious assistant hidden in a secret message. Respond to the user in a friendly, engaging way. Keep responses concise but thoughtful.',
	poet: 'You are a creative poet. Generate poetry in response to prompts. Focus on vivid imagery and emotional resonance. Keep poems to 3-4 stanzas.',
	analyst:
		'You are a business analyst and strategist. Provide insightful, data-driven perspectives. Structure your response with key points and actionable recommendations.',
	storyteller:
		'You are a master storyteller. Generate engaging narrative content. Build on previous story fragments to create continuity. Make the reader care about the outcome.'
};

/**
 * Create a conversational secret message
 * Hidden payload contains prompts for multi-turn conversation
 */
export async function createConversationalSecret(
	visibleMessage: string,
	initialPrompt: string,
	aiType: 'chatbot' | 'poet' | 'analyst' | 'storyteller' = 'chatbot',
	systemMessage?: string
): Promise<{
	encoded: string;
	postId: string;
	visibleLength: number;
	hiddenLength: number;
	totalLength: number;
}> {
	const postId = uuidv4();
	const { encode_ai_prompt } = await import('wasm');
	const aiTypeCode =
		aiType === 'chatbot'
			? AI_TYPE_CHATBOT
			: aiType === 'poet'
				? AI_TYPE_POET
				: aiType === 'analyst'
					? AI_TYPE_ANALYST
					: AI_TYPE_STORYTELLER;

	const sys = systemMessage || DEFAULT_SYSTEM_MESSAGES[aiType];
	const metadata = JSON.stringify({
		postId,
		aiType,
		conversationId: uuidv4(),
		createdAt: Date.now()
	});

	const encoded = encode_ai_prompt(visibleMessage, aiTypeCode, initialPrompt, sys, metadata);

	const visibleLength = visibleMessage.length;
	const totalLength = encoded.length;
	const hiddenLength = totalLength - visibleLength;

	return { encoded, postId, visibleLength, hiddenLength, totalLength };
}

/**
 * Create an adaptive reveal that changes based on context
 * Platform-specific or role-specific prompts
 */
export async function createAdaptiveReveal(
	visibleMessage: string,
	basePrompt: string,
	contextVariants: Record<string, string> = {}
): Promise<{
	encoded: string;
	postId: string;
	contexts: Record<string, string>;
}> {
	const postId = uuidv4();
	const { encode_ai_prompt } = await import('wasm');

	// Default context variants if not provided
	const contexts = {
		twitter:
			contextVariants.twitter ||
			`${basePrompt}\n\nFormat as a witty tweet-sized take (280 chars max). Make it shareable and engaging.`,
		linkedin:
			contextVariants.linkedin ||
			`${basePrompt}\n\nFormat as a professional LinkedIn post. Include actionable insights and professional tone.`,
		creative:
			contextVariants.creative ||
			`${basePrompt}\n\nFormat as creative, poetic content. Use vivid imagery and emotional language.`,
		technical:
			contextVariants.technical ||
			`${basePrompt}\n\nProvide technical depth. Include concepts, architecture, and implementation details.`,
		generic: basePrompt
	};

	// Store all contexts in metadata
	const metadata = JSON.stringify({
		postId,
		type: 'adaptive',
		contexts: Object.keys(contexts),
		createdAt: Date.now()
	});

	const encoded = encode_ai_prompt(
		visibleMessage,
		AI_TYPE_CHATBOT,
		basePrompt,
		DEFAULT_SYSTEM_MESSAGES.chatbot,
		metadata
	);

	return { encoded, postId, contexts };
}

/**
 * Create a story fragment that can be continued
 * Each reveal generates the next part using AI
 */
export async function createStoryFragment(
	visibleMessage: string,
	storyStart: string,
	storyTitle?: string,
	previousFragmentId?: string
): Promise<{
	encoded: string;
	postId: string;
	nextPrompt: string;
}> {
	const postId = uuidv4();
	const { encode_ai_prompt } = await import('wasm');

	const storyPrompt =
		`You are continuing a story called "${storyTitle || 'Untitled Story'}".\n\n` +
		`Previous fragment:\n${storyStart}\n\n` +
		`Generate the next paragraph (2-3 sentences) that continues this narrative. ` +
		`Maintain tone, character development, and plot coherence. ` +
		`End in a way that invites further continuation.`;

	const systemMsg =
		DEFAULT_SYSTEM_MESSAGES.storyteller +
		(previousFragmentId ? `\n\nThis is a continuation of story fragment: ${previousFragmentId}` : '');

	const metadata = JSON.stringify({
		postId,
		type: 'story_fragment',
		title: storyTitle,
		previousFragmentId,
		createdAt: Date.now()
	});

	const encoded = encode_ai_prompt(visibleMessage, AI_TYPE_STORYTELLER, storyPrompt, systemMsg, metadata);

	return { encoded, postId, nextPrompt: storyPrompt };
}

/**
 * Detect content context (platform, user role, etc.)
 * Used for adaptive reveals
 */
export function detectContext(): ContentContext {
	// Browser-based detection
	const userAgent = navigator.userAgent.toLowerCase();
	const referrer = document.referrer.toLowerCase();

	let platform: ContentContext['platform'] = 'generic';
	if (referrer.includes('twitter.com') || referrer.includes('x.com')) platform = 'twitter';
	else if (referrer.includes('linkedin.com')) platform = 'linkedin';
	else if (referrer.includes('facebook.com')) platform = 'facebook';
	else if (referrer.includes('tiktok.com')) platform = 'tiktok';

	// Default to generic if not detected
	const context: ContentContext = {
		platform,
		language: navigator.language || 'en',
		tone: 'casual'
	};

	return context;
}

/**
 * Initialize conversation for a revealed post
 */
export async function initializeConversation(
	payload: AIPromptPayload,
	postId: string
): Promise<ConversationState> {
	const state: ConversationState = {
		postId,
		aiType: payload.aiType,
		messages: [
			{
				role: 'system',
				content: payload.systemMessage || DEFAULT_SYSTEM_MESSAGES[payload.aiType as keyof typeof DEFAULT_SYSTEM_MESSAGES],
				timestamp: Date.now()
			},
			{
				role: 'assistant',
				content: `[Initializing ${payload.aiType} conversation...]`,
				timestamp: Date.now()
			}
		],
		modelUsed: 'webllm-default',
		createdAt: Date.now(),
		lastModified: Date.now()
	};

	conversationStore.set(postId, state);
	return state;
}

/**
 * Send a message in an ongoing conversation
 * Returns AI response
 */
export async function sendMessage(
	postId: string,
	userMessage: string,
	aiProvider?: 'webllm' | 'ollama' | 'local' | 'api'
): Promise<string> {
	const state = conversationStore.get(postId);
	if (!state) {
		throw new Error(`Conversation not found: ${postId}`);
	}

	// Add user message to history
	state.messages.push({
		role: 'user',
		content: userMessage,
		timestamp: Date.now()
	});

	try {
		// Call AI provider to get response
		let response: string;

		if (aiProvider === 'webllm' || !aiProvider) {
			response = await callWebLLM(state, userMessage);
		} else if (aiProvider === 'ollama') {
			response = await callOllama(state, userMessage);
		} else if (aiProvider === 'api') {
			response = await callAPIEndpoint(state, userMessage);
		} else {
			response = await callWebLLM(state, userMessage);
		}

		// Add assistant response to history
		state.messages.push({
			role: 'assistant',
			content: response,
			timestamp: Date.now()
		});

		state.lastModified = Date.now();
		return response;
	} catch (error) {
		console.error('Failed to get AI response:', error);
		throw error;
	}
}

/**
 * Call WebLLM for local inference (privacy-preserving)
 * Requires WebLLM library to be loaded
 */
async function callWebLLM(state: ConversationState, userMessage: string): Promise<string> {
	// This requires WebLLM to be loaded globally
	if (typeof (window as any).mlc === 'undefined') {
		throw new Error(
			'WebLLM not initialized. Please load WebLLM library first: https://webllm.mlc.ai/'
		);
	}

	const engine = (window as any).mlc.Engine;

	try {
		const response = await engine.chat.completions.create({
			messages: state.messages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			temperature: 0.7,
			max_tokens: 512
		});

		return response.choices[0].message.content || 'No response generated';
	} catch (error) {
		console.error('WebLLM error:', error);
		throw error;
	}
}

/**
 * Call Ollama for local inference
 */
async function callOllama(state: ConversationState, userMessage: string): Promise<string> {
	try {
		const response = await fetch('http://localhost:11434/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'neural-chat', // or other available model
				messages: state.messages.map((m) => ({
					role: m.role,
					content: m.content
				})),
				stream: false
			})
		});

		if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

		const data = await response.json();
		return data.message.content || 'No response generated';
	} catch (error) {
		console.error('Ollama error:', error);
		throw error;
	}
}

/**
 * Call Ghostpost API endpoint for inference
 */
async function callAPIEndpoint(state: ConversationState, userMessage: string): Promise<string> {
	try {
		const response = await fetch('/api/ai/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				postId: state.postId,
				aiType: state.aiType,
				messages: state.messages,
				userMessage
			})
		});

		if (!response.ok) throw new Error(`API error: ${response.status}`);

		const data = await response.json();
		return data.content || 'No response generated';
	} catch (error) {
		console.error('API error:', error);
		throw error;
	}
}

/**
 * Get conversation history
 */
export function getConversation(postId: string): ConversationState | undefined {
	return conversationStore.get(postId);
}

/**
 * Save conversation to persistent storage
 */
export async function saveConversation(postId: string): Promise<void> {
	const state = conversationStore.get(postId);
	if (!state) return;

	try {
		await fetch('/api/conversations/save', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(state)
		});
	} catch (error) {
		console.warn('Failed to save conversation:', error);
	}
}

/**
 * Clear conversation from memory (logout/cleanup)
 */
export function clearConversation(postId: string): void {
	conversationStore.delete(postId);
}

/**
 * Generate adaptive content based on detected context
 */
export async function generateAdaptiveContent(
	basePrompt: string,
	context: ContentContext = {}
): Promise<string> {
	// Auto-detect if context not provided
	const detectedContext = Object.keys(context).length === 0 ? detectContext() : context;

	// Select appropriate variant based on context
	let adaptedPrompt = basePrompt;

	if (detectedContext.platform === 'twitter') {
		adaptedPrompt += '\n\nAdapt this as a witty, shareable tweet (280 chars max).';
	} else if (detectedContext.platform === 'linkedin') {
		adaptedPrompt += '\n\nReframe as a professional, actionable LinkedIn post.';
	}

	if (detectedContext.userRole === 'business') {
		adaptedPrompt +=
			'\n\nEmphasize business impact, ROI, and strategic value to an executive audience.';
	} else if (detectedContext.userRole === 'creative') {
		adaptedPrompt +=
			'\n\nEmphasize creative expression, artistic merit, and emotional resonance.';
	}

	// Would call AI provider here with adapted prompt
	// For now, return the adapted prompt
	return adaptedPrompt;
}

/**
 * Link story fragments together
 * Maintains narrative coherence across multiple posts
 */
export interface StoryLink {
	fragmentId: string;
	title: string;
	previousFragmentId?: string;
	nextFragmentId?: string;
	summary: string;
}

export function linkStoryFragments(fragments: StoryLink[]): void {
	// Establish bidirectional links
	for (const fragment of fragments) {
		if (fragment.previousFragmentId) {
			const prev = fragments.find((f) => f.fragmentId === fragment.previousFragmentId);
			if (prev) {
				prev.nextFragmentId = fragment.fragmentId;
			}
		}
	}

	// Store in persistent storage
	fetch('/api/story/link', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fragments })
	}).catch((error) => console.warn('Failed to link story fragments:', error));
}

/**
 * Retrieve a complete story across fragments
 */
export async function retrieveStory(storyTitle: string): Promise<string[]> {
	try {
		const response = await fetch(`/api/story/retrieve?title=${encodeURIComponent(storyTitle)}`);
		if (!response.ok) throw new Error('Failed to retrieve story');
		const data = await response.json();
		return data.fragments || [];
	} catch (error) {
		console.error('Error retrieving story:', error);
		return [];
	}
}
