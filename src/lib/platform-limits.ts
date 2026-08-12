export type SocialPlatform = 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'reddit';

export interface PlatformLimit {
	label: string;
	maxCharacters: number;
}

export const PLATFORM_LIMITS: Record<SocialPlatform, PlatformLimit> = {
	twitter: { label: 'Twitter/X', maxCharacters: 280 },
	linkedin: { label: 'LinkedIn', maxCharacters: 3000 },
	facebook: { label: 'Facebook', maxCharacters: 63206 },
	tiktok: { label: 'TikTok', maxCharacters: 2200 },
	reddit: { label: 'Reddit', maxCharacters: 40000 }
};

export function getPlatformLimit(platform: SocialPlatform): PlatformLimit {
	return PLATFORM_LIMITS[platform];
}

export function fitsPlatform(platform: SocialPlatform, content: string): boolean {
	return content.length <= getPlatformLimit(platform).maxCharacters;
}
