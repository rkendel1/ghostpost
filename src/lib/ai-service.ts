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

export interface ReactiveContext {
	platform: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'generic';
	timestamp: number;
	timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'; // 6-12, 12-17, 17-22, 22-6
	userRole?: 'creator' | 'business' | 'engineer' | 'designer' | 'manager' | 'student' | 'general';
	userDevice: 'mobile' | 'tablet' | 'desktop';
	userLanguage: string; // e.g., 'en-US', 'fr-FR'
	userLocation?: string; // e.g., 'US-CA', 'GB-EN'
	referrer: string;
	userAgent: string;
	screenSize?: { width: number; height: number };
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
 * Detect comprehensive reactive context for AI responses
 * Includes time-of-day, device type, location, etc.
 */
export function detectReactiveContext(): ReactiveContext {
	const now = new Date();
	const hours = now.getHours();

	// Determine time of day
	let timeOfDay: ReactiveContext['timeOfDay'] = 'night';
	if (hours >= 6 && hours < 12) timeOfDay = 'morning';
	else if (hours >= 12 && hours < 17) timeOfDay = 'afternoon';
	else if (hours >= 17 && hours < 22) timeOfDay = 'evening';

	// Detect device type
	const userAgent = navigator.userAgent.toLowerCase();
	let userDevice: ReactiveContext['userDevice'] = 'desktop';
	if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
		if (/ipad|tablet/.test(userAgent)) userDevice = 'tablet';
		else userDevice = 'mobile';
	}

	// Detect platform
	const referrer = document.referrer.toLowerCase();
	let platform: ReactiveContext['platform'] = 'generic';
	if (referrer.includes('twitter.com') || referrer.includes('x.com')) platform = 'twitter';
	else if (referrer.includes('linkedin.com')) platform = 'linkedin';
	else if (referrer.includes('facebook.com')) platform = 'facebook';
	else if (referrer.includes('tiktok.com')) platform = 'tiktok';

	// Infer user role from context clues
	let userRole: ReactiveContext['userRole'] = 'general';
	if (referrer.includes('linkedin.com')) userRole = 'business';
	if (userAgent.includes('github')) userRole = 'engineer';

	const context: ReactiveContext = {
		platform,
		timestamp: now.getTime(),
		timeOfDay,
		userRole,
		userDevice,
		userLanguage: navigator.language || 'en-US',
		referrer: document.referrer || 'direct',
		userAgent: navigator.userAgent,
		screenSize: {
			width: window.innerWidth,
			height: window.innerHeight
		}
	};

	// Add location if available (requires permission)
	if ('geolocation' in navigator) {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				// Convert coordinates to approximate location (rough)
				const lat = position.coords.latitude;
				const lng = position.coords.longitude;
				// In real app, use reverse geocoding service
				context.userLocation = `${lat.toFixed(2)},${lng.toFixed(2)}`;
			},
			() => {
				// Geolocation denied, skip location
			}
		);
	}

	return context;
}

/**
 * Build a system message that's reactive to context
 * AI will tailor responses based on these instructions
 */
export function buildReactiveSystemMessage(
	baseSystemMessage: string,
	context: ReactiveContext
): string {
	const contextInstructions = `
## IMPORTANT: Respond based on these context factors:

**Platform:** ${context.platform}
- Twitter: Keep concise (280 chars), witty, shareable
- LinkedIn: Professional, business-focused, include actionable insights
- TikTok: Short, engaging, trend-aware
- Generic: Balanced, suitable for general audiences

**Time of Day:** ${context.timeOfDay} (${new Date(context.timestamp).toLocaleTimeString()})
- Morning (6-12): Professional, focused, action-oriented
- Afternoon (12-17): Energetic, engaging, collaborative
- Evening (17-22): Casual, reflective, conversational
- Night (22-6): Brief, considerate of sleep time

**Device:** ${context.userDevice}
- Mobile: Short paragraphs, bullets, avoid long blocks
- Tablet: Balanced, scannable format
- Desktop: Can include detailed, long-form content

**User Role:** ${context.userRole}
- Engineer: Technical depth, code examples, architecture
- Business: Strategic perspective, ROI, business impact
- Creative: Artistic merit, innovation, emotional resonance
- Manager: Team dynamics, process, metrics
- Student: Educational, explanatory, learning-focused
- General: Accessible, balanced, broad appeal

**Language:** ${context.userLanguage}
- Use appropriate idioms and cultural references
- Respect regional preferences and spelling

## RESPOND NATURALLY
Don't explicitly mention these factors. Incorporate them naturally into your response.
Let your personality adapt to the context while remaining authentic.

## Base Instruction:
${baseSystemMessage}
`;

	return contextInstructions;
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
 * Returns AI response (context-reactive)
 */
export async function sendMessage(
	postId: string,
	userMessage: string,
	aiProvider?: 'webllm' | 'ollama' | 'local' | 'api',
	includeReactiveContext = true
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
		// Detect reactive context if enabled
		let messages = [...state.messages];
		if (includeReactiveContext) {
			const context = detectReactiveContext();
			const systemMsg = messages.find((m) => m.role === 'system');
			if (systemMsg) {
				// Enhance system message with reactive context
				const enhancedSystem = buildReactiveSystemMessage(
					systemMsg.content,
					context
				);
				messages = messages.map((m) =>
					m.role === 'system' ? { ...m, content: enhancedSystem } : m
				);
			}
		}

		// Call AI provider to get response
		let response: string;

		if (aiProvider === 'webllm' || !aiProvider) {
			response = await callWebLLM({ ...state, messages }, userMessage);
		} else if (aiProvider === 'ollama') {
			response = await callOllama({ ...state, messages }, userMessage);
		} else if (aiProvider === 'api') {
			response = await callAPIEndpoint({ ...state, messages }, userMessage);
		} else {
			response = await callWebLLM({ ...state, messages }, userMessage);
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
