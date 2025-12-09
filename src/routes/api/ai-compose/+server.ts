import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This will use OPENAI_API_KEY from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * POST /api/ai-compose
 * Generate social media post content using OpenAI
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { prompt, platform = 'twitter' } = await request.json();

    if (!prompt) {
      return json(
        {
          success: false,
          error: 'Prompt is required'
        },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return json(
        {
          success: false,
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
        },
        { status: 500 }
      );
    }

    // Platform-specific character limits and guidelines
    const platformGuidelines: Record<string, string> = {
      twitter: 'Keep it under 280 characters, casual and engaging.',
      linkedin: 'Professional tone, can be longer (up to 3000 chars), thought-leadership style.',
      facebook: 'Conversational, engaging, can use emojis, moderate length.',
      tiktok: 'Fun, trendy, can use hashtags and emojis, caption style (under 150 chars).'
    };

    const systemPrompt = `You are a social media content creator. Generate a ${platform} post based on the user's prompt. ${platformGuidelines[platform] || platformGuidelines.twitter}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content.trim();

    return json({
      success: true,
      content: generatedContent,
      platform: platform
    });
  } catch (error) {
    console.error('Error in /api/ai-compose:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content'
      },
      { status: 500 }
    );
  }
};
