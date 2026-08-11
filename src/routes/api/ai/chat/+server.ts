import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * AI Chat Endpoint
 * Handles conversational secrets and adaptive reveals
 * Routes to appropriate LLM provider (WebLLM, Ollama, OpenAI, etc.)
 */

interface ChatRequest {
	postId: string;
	aiType: string;
	messages: Array<{
		role: 'system' | 'user' | 'assistant';
		content: string;
	}>;
	userMessage: string;
	provider?: 'webllm' | 'ollama' | 'openai' | 'anthropic';
	model?: string;
	temperature?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ChatRequest;
		const { messages, provider = 'ollama', model = 'neural-chat', temperature = 0.7 } = body;

		if (!messages || messages.length === 0) {
			return json({ error: 'No messages provided' }, { status: 400 });
		}

		let content: string;

		// Route to appropriate provider
		if (provider === 'ollama') {
			content = await callOllama(messages, model, temperature);
		} else if (provider === 'openai') {
			content = await callOpenAI(messages, model, temperature);
		} else if (provider === 'anthropic') {
			content = await callAnthropic(messages, model, temperature);
		} else {
			// Default to Ollama (can be run locally)
			content = await callOllama(messages, model, temperature);
		}

		return json({ content, provider, model });
	} catch (error) {
		console.error('Chat API error:', error);
		return json(
			{ error: 'Failed to generate response', details: String(error) },
			{ status: 500 }
		);
	}
};

async function callOllama(
	messages: Array<{ role: string; content: string }>,
	model: string,
	temperature: number
): Promise<string> {
	const response = await fetch('http://localhost:11434/api/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			messages,
			temperature,
			stream: false
		})
	});

	if (!response.ok) {
		throw new Error(`Ollama error: ${response.status} - Is Ollama running on localhost:11434?`);
	}

	const data = await response.json();
	return data.message?.content || 'No response generated';
}

async function callOpenAI(
	messages: Array<{ role: string; content: string }>,
	model: string,
	temperature: number
): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error('OPENAI_API_KEY not configured');
	}

	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: model || 'gpt-3.5-turbo',
			messages,
			temperature,
			max_tokens: 512
		})
	});

	if (!response.ok) {
		throw new Error(`OpenAI error: ${response.status}`);
	}

	const data = await response.json();
	return data.choices?.[0]?.message?.content || 'No response generated';
}

async function callAnthropic(
	messages: Array<{ role: string; content: string }>,
	model: string,
	temperature: number
): Promise<string> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error('ANTHROPIC_API_KEY not configured');
	}

	// Extract system message if present
	let systemMessage = '';
	const userMessages = messages.filter((m) => {
		if (m.role === 'system') {
			systemMessage = m.content;
			return false;
		}
		return true;
	});

	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: model || 'claude-3-5-sonnet-20241022',
			max_tokens: 512,
			temperature,
			...(systemMessage && { system: systemMessage }),
			messages: userMessages.map((m) => ({
				role: m.role === 'assistant' ? 'assistant' : 'user',
				content: m.content
			}))
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	return data.content?.[0]?.text || 'No response generated';
}
