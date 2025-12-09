import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/post
 * Stub endpoint for posting to social media platforms
 * Returns success with instructions for manual posting via copy/paste
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { content, platform } = await request.json();

    if (!content || !platform) {
      return json(
        {
          success: false,
          error: 'Content and platform are required'
        },
        { status: 400 }
      );
    }

    // Stub implementations for each platform
    const platformInfo: Record<string, { message: string; url: string; instructions: string }> = {
      twitter: {
        message: 'Ready to post to Twitter/X',
        url: 'https://twitter.com/compose/tweet',
        instructions: 'The encoded message has been copied to your clipboard. Click "Open Twitter" to compose a new tweet, then paste and send!'
      },
      linkedin: {
        message: 'Ready to post to LinkedIn',
        url: 'https://www.linkedin.com/feed/',
        instructions: 'The encoded message has been copied to your clipboard. Click "Open LinkedIn" to start a post, then paste and share!'
      },
      facebook: {
        message: 'Ready to post to Facebook',
        url: 'https://www.facebook.com/',
        instructions: 'The encoded message has been copied to your clipboard. Click "Open Facebook" to create a post, then paste and publish!'
      },
      tiktok: {
        message: 'Ready to post to TikTok',
        url: 'https://www.tiktok.com/upload',
        instructions: 'The encoded message has been copied to your clipboard. TikTok requires video content - use this as your caption when uploading a video!'
      }
    };

    const info = platformInfo[platform.toLowerCase()];

    if (!info) {
      return json(
        {
          success: false,
          error: `Unsupported platform: ${platform}. Supported: twitter, linkedin, facebook, tiktok`
        },
        { status: 400 }
      );
    }

    // Log for debugging (in production environment)
    console.log(`[STUB] Prepared post for ${platform}:`, content.substring(0, 50) + '...');

    return json({
      success: true,
      message: info.message,
      platform: platform,
      postUrl: info.url,
      instructions: info.instructions,
      timestamp: new Date().toISOString(),
      note: 'Copy the encoded message and paste it manually on the platform. API integration can be added later with proper credentials.'
    });
  } catch (error) {
    console.error('Error in /api/post:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process post request'
      },
      { status: 500 }
    );
  }
};
