/**
 * Browser Extension - DOM Walker for Finding Hidden Messages
 * (Standalone version for content scripts)
 */

const INVISIBLE_CHARS_REGEX = /[​‌‍‎‏‬‭⁠﻿]/;

function walkDOM(root = document.body, callback, includeHidden = false, visitedRoots = new WeakSet()) {
	if (visitedRoots.has(root)) return;
	visitedRoots.add(root);

	if (!includeHidden && root instanceof Element) {
		const style = window.getComputedStyle(root);
		if (style.display === 'none' || style.visibility === 'hidden') {
			return;
		}
	}

	callback(root);

	if (root instanceof Element && root.shadowRoot) {
		walkDOM(root.shadowRoot, callback, includeHidden, visitedRoots);
	}

	const childNodes = root.childNodes;
	for (let i = 0; i < childNodes.length; i++) {
		walkDOM(childNodes[i], callback, includeHidden, visitedRoots);
	}

	if (root instanceof HTMLIFrameElement) {
		try {
			const iframeDoc = root.contentDocument || root.contentWindow?.document;
			if (iframeDoc) {
				walkDOM(iframeDoc.body || iframeDoc.documentElement, callback, includeHidden, visitedRoots);
			}
		} catch (e) {}
	}
}

function detectPlatform() {
	const hostname = window.location.hostname;

	if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'x';
	if (hostname.includes('reddit.com')) return 'reddit';
	if (hostname.includes('facebook.com')) return 'facebook';
	if (hostname.includes('instagram.com')) return 'instagram';
	if (hostname.includes('linkedin.com')) return 'linkedin';
	if (hostname.includes('tiktok.com')) return 'tiktok';
	if (hostname.includes('threads.net')) return 'threads';
	if (hostname.includes('discord.com')) return 'discord';

	return 'generic';
}

const platformContextFinders = {
	x: (el) => {
		const article = el.closest('article');
		if (article) {
			const authorLink = article.querySelector('a[href*="/"]');
			const author = authorLink?.textContent || 'Unknown';
			const time = article.querySelector('time');
			const timestamp = time?.getAttribute('datetime') || '';
			return `@${author} · ${timestamp}`;
		}
		return 'X Post';
	},

	reddit: (el) => {
		const shredditPost = el.closest('shreddit-post, div[data-testid="post"]');
		const shredditComment = el.closest('shreddit-comment, div[data-testid="comment"]');

		if (shredditPost) {
			const author = shredditPost.getAttribute('author') || 'Unknown';
			const subreddit = window.location.pathname.split('/')[2] || 'reddit';
			return `r/${subreddit} · ${author}`;
		}

		if (shredditComment) {
			const author = shredditComment.getAttribute('author') || 'Unknown';
			return `Comment by ${author}`;
		}

		return 'Reddit Post';
	},

	facebook: (el) => {
		const article = el.closest('article');
		if (article) {
			const author = article.querySelector('[data-uia="feed_story_header_title"]')?.textContent || 'Unknown';
			return `${author} on Facebook`;
		}
		return 'Facebook Post';
	},

	generic: (el) => {
		const article = el.closest('article');
		const post = el.closest('[data-testid="post"], .post, .tweet');
		const container = article || post;

		if (container) {
			const author = container.querySelector('[data-test-id*="author"], .author')?.textContent;
			const title = container.querySelector('h1, h2, h3')?.textContent;

			if (author || title) {
				return `${author || title || 'Post'}`;
			}
		}

		return 'Web Page';
	}
};

const metadataExtractors = {
	x: (el) => {
		const article = el.closest('article');
		if (!article) return {};

		const link = article.querySelector('a[href*="/status/"]');
		const postId = link?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1];
		const authorLink = article.querySelector('a[href*="/"]');
		const authorId = authorLink?.getAttribute('href')?.slice(1);
		const time = article.querySelector('time');
		const timestamp = time?.getAttribute('datetime');

		return { postId, authorId, timestamp, url: link?.href };
	},

	reddit: (el) => {
		const post = el.closest('shreddit-post');
		if (!post) return {};

		const postId = post.getAttribute('id') || post.getAttribute('data-post-id');
		const author = post.getAttribute('author');
		const timestamp = post.getAttribute('timestamp-utc');

		return { postId, authorId: author, timestamp, url: post.getAttribute('href') };
	},

	generic: (el) => {
		const article = el.closest('article');
		if (!article) return {};
		return { url: window.location.href, postId: article.id };
	}
};

const platformSpecificFinders = {
	x: () => {
		const messages = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			const textElements = article.querySelectorAll('[lang], div[role="paragraph"]');

			textElements.forEach((el) => {
				const text = el.textContent || '';
				if (INVISIBLE_CHARS_REGEX.test(text)) {
					const context = platformContextFinders.x(el);
					const metadata = metadataExtractors.x(el);

					messages.push({
						text,
						element: el,
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
		const messages = [];
		const posts = document.querySelectorAll('shreddit-post, div[data-testid="post"]');
		const comments = document.querySelectorAll('shreddit-comment, div[data-testid="comment"]');

		const allElements = [...posts, ...comments];

		allElements.forEach((el) => {
			const textContent = el.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(textContent)) {
				const bodyEl = el.querySelector('[slot="post-content-body"], [slot="commentContent"], .md');

				if (bodyEl) {
					const context = platformContextFinders.reddit(el);
					const metadata = metadataExtractors.reddit(el);

					messages.push({
						text: bodyEl.textContent || '',
						element: bodyEl,
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
		const messages = [];
		const articles = document.querySelectorAll('article');

		articles.forEach((article) => {
			const text = article.textContent || '';
			if (INVISIBLE_CHARS_REGEX.test(text)) {
				const context = platformContextFinders.facebook(article);
				const metadata = metadataExtractors.facebook(article);

				messages.push({
					text,
					element: article,
					context,
					platform: 'facebook',
					metadata
				});
			}
		});

		return messages;
	}
};

function findPlatformSpecificMessages() {
	const platform = detectPlatform();
	const finder = platformSpecificFinders[platform];

	if (finder) {
		return finder();
	}

	return [];
}

function watchForNewMessages(callback, options = { debounceMs: 500 }) {
	let timeoutId = null;
	const lastFoundMessages = new Set();

	const checkForNew = () => {
		const messages = findPlatformSpecificMessages();
		const newMessages = messages.filter((m) => !lastFoundMessages.has(m.element));

		newMessages.forEach((m) => lastFoundMessages.add(m.element));

		if (newMessages.length > 0) {
			callback(newMessages);
		}
	};

	const observer = new MutationObserver(() => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(checkForNew, options.debounceMs);
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: false
	});

	return () => {
		observer.disconnect();
		if (timeoutId) clearTimeout(timeoutId);
	};
}
