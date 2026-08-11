/**
 * Advanced DOM Walker for Finding Hidden Messages
 * Traverses shadow DOM, iframes, and complex nested structures
 * with site-specific detection logic
 */

export interface DetectedMessage {
	text: string;
	element: HTMLElement;
	context: string; // Author, timestamp, or other context
	platform: string; // x, reddit, facebook, etc.
	metadata: {
		postId?: string;
		authorId?: string;
		timestamp?: string;
		url?: string;
	};
}

// Regex for detecting invisible Unicode characters (same as in decode)
const INVISIBLE_CHARS_REGEX = /[​‌‍‎‏‬‭⁠﻿]/;

/**
 * Walk the entire DOM including shadow DOM and iframes
 */
export function walkDOM(
	root: Node = document.body,
	callback: (node: Node) => void,
	includeHidden = false,
	visitedRoots = new WeakSet<Node>()
): void {
	if (visitedRoots.has(root)) return;
	visitedRoots.add(root);

	// Skip hidden elements if not requested
	if (!includeHidden && root instanceof Element) {
		const style = window.getComputedStyle(root);
		if (style.display === 'none' || style.visibility === 'hidden') {
			return;
		}
	}

	callback(root);

	// Handle shadow DOM
	if (root instanceof Element && root.shadowRoot) {
		walkDOM(root.shadowRoot, callback, includeHidden, visitedRoots);
	}

	// Handle regular children
	const childNodes = root.childNodes;
	for (let i = 0; i < childNodes.length; i++) {
		walkDOM(childNodes[i], callback, includeHidden, visitedRoots);
	}

	// Handle iframes (with security checks)
	if (root instanceof HTMLIFrameElement) {
		try {
			const iframeDoc = root.contentDocument || root.contentWindow?.document;
			if (iframeDoc) {
				walkDOM(iframeDoc.body || iframeDoc.documentElement, callback, includeHidden, visitedRoots);
			}
		} catch (e) {
			// Cross-origin iframes are blocked - that's expected
		}
	}
}

/**
 * Find all text nodes containing invisible characters
 */
export function findHiddenMessages(root: Node = document.body): DetectedMessage[] {
	const messages: DetectedMessage[] = [];
	const visitedNodes = new WeakSet<Node>();

	walkDOM(root, (node) => {
		// Skip if already processed
		if (visitedNodes.has(node)) return;
		visitedNodes.add(node);

		// Only process text nodes
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(text)) {
				const element = node.parentElement;
				if (element) {
					const context = getContext(element);
					const platform = detectPlatform();
					const metadata = extractMetadata(element, platform);

					messages.push({
						text: element.textContent || '',
						element,
						context,
						platform,
						metadata
					});
				}
			}
		}
	});

	return messages;
}

/**
 * Get context around a message (author, timestamp, etc)
 */
function getContext(element: HTMLElement): string {
	const platform = detectPlatform();
	const contextFinders = platformContextFinders[platform] || platformContextFinders.generic;
	return contextFinders(element);
}

/**
 * Detect which platform we're on
 */
export function detectPlatform(): string {
	const hostname = window.location.hostname;

	if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'x';
	if (hostname.includes('reddit.com')) return 'reddit';
	if (hostname.includes('facebook.com')) return 'facebook';
	if (hostname.includes('instagram.com')) return 'instagram';
	if (hostname.includes('linkedin.com')) return 'linkedin';
	if (hostname.includes('tiktok.com')) return 'tiktok';
	if (hostname.includes('threads.net')) return 'threads';
	if (hostname.includes('mastodon')) return 'mastodon';
	if (hostname.includes('bluesky.app')) return 'bluesky';
	if (hostname.includes('discord.com')) return 'discord';
	if (hostname.includes('slack.com')) return 'slack';

	return 'generic';
}

/**
 * Extract metadata from element based on platform
 */
function extractMetadata(element: HTMLElement, platform: string): DetectedMessage['metadata'] {
	const extractors = metadataExtractors[platform] || metadataExtractors.generic;
	return extractors(element);
}

/**
 * Platform-specific context finders
 */
const platformContextFinders: Record<string, (el: HTMLElement) => string> = {
	x: (el) => {
		// Find X.com tweet author and timestamp
		const article = el.closest('article');
		if (article) {
			// Find author link
			const authorLink = article.querySelector('a[href*="/"]');
			const author = authorLink?.textContent || 'Unknown';

			// Find timestamp
			const time = article.querySelector('time');
			const timestamp = time?.getAttribute('datetime') || '';

			return `@${author} · ${timestamp}`;
		}
		return 'X Post';
	},

	reddit: (el) => {
		// Find Reddit post/comment author and subreddit
		const shredditPost = el.closest('shreddit-post, div[data-testid="post"]');
		const shredditComment = el.closest('shreddit-comment, div[data-testid="comment"]');

		if (shredditPost) {
			const author = shredditPost.querySelector('[slot="title"]')?.textContent || 'Unknown';
			const subreddit = window.location.pathname.split('/')[2] || 'reddit';
			return `r/${subreddit} · ${author}`;
		}

		if (shredditComment) {
			const author = shredditComment.querySelector('[slot="author"]')?.textContent || 'Unknown';
			return `Comment by ${author}`;
		}

		return 'Reddit Post';
	},

	facebook: (el) => {
		// Find Facebook post author
		const role = el.getAttribute('role');
		if (role === 'article') {
			const author = el.querySelector('[data-uia="feed_story_header_title"]')?.textContent || 'Unknown';
			return `${author} on Facebook`;
		}
		return 'Facebook Post';
	},

	instagram: (el) => {
		// Find Instagram post author
		const article = el.closest('article');
		if (article) {
			const header = article.querySelector('header');
			const author = header?.querySelector('a')?.textContent || 'Unknown';
			return `@${author} on Instagram`;
		}
		return 'Instagram Post';
	},

	linkedin: (el) => {
		// Find LinkedIn post author
		const article = el.closest('article');
		if (article) {
			const author = article.querySelector('[data-test-id="actor-name-link"]')?.textContent || 'Unknown';
			return `${author} on LinkedIn`;
		}
		return 'LinkedIn Post';
	},

	generic: (el) => {
		// Try to find any author or title nearby
		const article = el.closest('article');
		const post = el.closest('[data-testid="post"], .post, .tweet');
		const container = article || post || el.closest('div[role="article"]');

		if (container) {
			const author = container.querySelector('[data-test-id*="author"], .author, [class*="author"]')?.textContent;
			const title = container.querySelector('h1, h2, h3')?.textContent;

			if (author || title) {
				return `${author || title || 'Post'}`;
			}
		}

		return 'Web Page';
	}
};

/**
 * Platform-specific metadata extractors
 */
const metadataExtractors: Record<string, (el: HTMLElement) => DetectedMessage['metadata']> = {
	x: (el) => {
		const article = el.closest('article');
		if (!article) return {};

		// Extract post ID from data attributes or href
		const link = article.querySelector('a[href*="/status/"]');
		const postId = link?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1];

		// Extract author ID
		const authorLink = article.querySelector('a[href*="/"]');
		const authorId = authorLink?.getAttribute('href')?.slice(1);

		// Extract timestamp
		const time = article.querySelector('time');
		const timestamp = time?.getAttribute('datetime');

		return {
			postId,
			authorId,
			timestamp,
			url: link?.href
		};
	},

	reddit: (el) => {
		const post = el.closest('shreddit-post');
		if (!post) return {};

		const postId = post.getAttribute('id') || post.getAttribute('data-post-id');
		const author = post.getAttribute('author') || post.querySelector('[slot="author"]')?.textContent;
		const timestamp = post.getAttribute('timestamp-utc');

		return {
			postId,
			authorId: author,
			timestamp,
			url: post.getAttribute('href')
		};
	},

	facebook: (el) => {
		const article = el.closest('article');
		if (!article) return {};

		const postId = article.getAttribute('data-ft');
		const link = article.querySelector('a[href*="/posts/"]');

		return {
			postId,
			url: link?.href
		};
	},

	generic: (el) => {
		const article = el.closest('article');
		const post = el.closest('[data-testid="post"], .post');
		const container = article || post;

		if (!container) return {};

		return {
			url: (container as any).href || window.location.href,
			postId: container.id
		};
	}
};

/**
 * Find messages by walking to specific content areas on each platform
 */
export function findPlatformSpecificMessages(): DetectedMessage[] {
	const platform = detectPlatform();
	const finder = platformSpecificFinders[platform];

	if (finder) {
		return finder();
	}

	// Fallback to generic search
	return findHiddenMessages();
}

/**
 * Platform-specific message finders
 */
const platformSpecificFinders: Record<string, () => DetectedMessage[]> = {
	x: () => {
		const messages: DetectedMessage[] = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			// X tweets can have text in multiple places
			const textElements = article.querySelectorAll('[lang], div[role="paragraph"]');

			textElements.forEach((el) => {
				const text = el.textContent || '';
				if (INVISIBLE_CHARS_REGEX.test(text)) {
					const context = platformContextFinders.x(el as HTMLElement);
					const metadata = metadataExtractors.x(el as HTMLElement);

					messages.push({
						text,
						element: el as HTMLElement,
						context,
						platform: 'x',
						metadata
					});
				}
			});
		});

		return messages;
	},

	reddit: () => {
		const messages: DetectedMessage[] = [];

		// Find both posts and comments
		const posts = document.querySelectorAll('shreddit-post, div[data-testid="post"]');
		const comments = document.querySelectorAll('shreddit-comment, div[data-testid="comment"]');

		const allElements = [...posts, ...comments];

		allElements.forEach((el) => {
			const textContent = el.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(textContent)) {
				const bodyEl = el.querySelector('[slot="post-content-body"], [slot="commentContent"], .md');

				if (bodyEl) {
					const context = platformContextFinders.reddit(el as HTMLElement);
					const metadata = metadataExtractors.reddit(el as HTMLElement);

					messages.push({
						text: bodyEl.textContent || '',
						element: bodyEl as HTMLElement,
						context,
						platform: 'reddit',
						metadata
					});
				}
			}
		});

		return messages;
	},

	facebook: () => {
		const messages: DetectedMessage[] = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			const text = article.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(text)) {
				const context = platformContextFinders.facebook(article as HTMLElement);
				const metadata = metadataExtractors.facebook(article as HTMLElement);

				messages.push({
					text,
					element: article as HTMLElement,
					context,
					platform: 'facebook',
					metadata
				});
			}
		});

		return messages;
	},

	instagram: () => {
		const messages: DetectedMessage[] = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			// Instagram posts have text in captions
			const captions = article.querySelectorAll('span, div[role="menuitem"]');

			captions.forEach((caption) => {
				const text = caption.textContent || '';
				if (INVISIBLE_CHARS_REGEX.test(text)) {
					const context = platformContextFinders.instagram(article as HTMLElement);
					const metadata = metadataExtractors.instagram(article as HTMLElement);

					messages.push({
						text,
						element: caption as HTMLElement,
						context,
						platform: 'instagram',
						metadata
					});
				}
			});
		});

		return messages;
	},

	linkedin: () => {
		const messages: DetectedMessage[] = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			const text = article.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(text)) {
				const context = platformContextFinders.linkedin(article as HTMLElement);
				const metadata = metadataExtractors.linkedin(article as HTMLElement);

				messages.push({
					text,
					element: article as HTMLElement,
					context,
					platform: 'linkedin',
					metadata
				});
			}
		});

		return messages;
	}
};

/**
 * Watch for new messages added to the page (useful for infinite scroll)
 */
export function watchForNewMessages(
	callback: (messages: DetectedMessage[]) => void,
	options = { debounceMs: 500 }
): () => void {
	let timeoutId: NodeJS.Timeout | null = null;
	const lastFoundMessages = new Set<HTMLElement>();

	const checkForNew = () => {
		const messages = findPlatformSpecificMessages();
		const newMessages = messages.filter((m) => !lastFoundMessages.has(m.element));

		newMessages.forEach((m) => lastFoundMessages.add(m.element));

		if (newMessages.length > 0) {
			callback(newMessages);
		}
	};

	// Set up MutationObserver for DOM changes
	const observer = new MutationObserver(() => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(checkForNew, options.debounceMs);
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: false
	});

	// Return cleanup function
	return () => {
		observer.disconnect();
		if (timeoutId) clearTimeout(timeoutId);
	};
}

/**
 * Highlight detected messages on the page
 */
export function highlightMessages(messages: DetectedMessage[], color = '#FFD700'): () => void {
	const originals: Array<{ element: HTMLElement; style: string }> = [];

	messages.forEach((msg) => {
		const el = msg.element;
		originals.push({
			element: el,
			style: el.style.backgroundColor
		});

		el.style.backgroundColor = color;
		el.style.outline = `3px solid ${color}`;
		el.style.borderRadius = '4px';
		el.style.padding = '2px 4px';
	});

	// Return cleanup function
	return () => {
		originals.forEach(({ element, style }) => {
			element.style.backgroundColor = style;
			element.style.outline = '';
			element.style.borderRadius = '';
			element.style.padding = '';
		});
	};
}
