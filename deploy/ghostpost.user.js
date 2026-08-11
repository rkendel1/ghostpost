// ==UserScript==
// @name         🔍 Ghostpost Message Detector
// @namespace    https://ghostpost.app/
// @version      2.0.0
// @description  Automatically detects and reveals hidden messages with invisible characters
// @author       Ghostpost Team
// @match        *://*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_openInTab
// @run-at       document-end
// @connect      *
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRleHQgeD0iOCIgeT0iMjAiIGZvbnQtc2l6ZT0iMjQiPvCfk4s8L3RleHQ+PC9zdmc+
// @noframes
// ==/UserScript==

/**
 * Ghostpost Userscript
 * Detects hidden messages using invisible Unicode characters
 * Works on all major social media platforms
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    apiBase: 'https://ghostpost.app',
    enableNotifications: true,
    debounceMs: 500,
    scanIntervalMs: 10000
  };

  // Invisible characters used for encoding
  const INVISIBLE_CHARS = [
    '​', // Zero Width Space
    '‌', // Zero Width Non-Joiner
    '‍', // Zero Width Joiner
    '‎', // Left-to-Right Mark
    '‏', // Right-to-Left Mark
    '‬', // Pop Directional Formatting
    '‭', // Left-to-Right Override
    '⁠', // Word Joiner
    '﻿'  // Zero Width No-Break Space
  ];

  const invisibleCharRegex = new RegExp(`[${INVISIBLE_CHARS.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')}]`, 'g');
  const MIN_INVISIBLE_CHAR_COUNT = 8;
  const MAX_INVISIBLE_RATIO = 0.5;
  const SPARSE_RATIO_THRESHOLD = 0.01;
  const SPARSE_COUNT_THRESHOLD = 20;
  const HIGH_COUNT_THRESHOLD = 30;
  const MIN_CLUSTER_SIZE = 5;
  const CLUSTER_DISTANCE = 50;
  const CLUSTER_RATIO_THRESHOLD = 0.6;

  let detectedMessages = new Map();
  let scanTimeout = null;

  /**
   * Check if invisible characters are clustered (indicating encoding)
   */
  function areClustered(text, matches) {
    if (matches.length < MIN_CLUSTER_SIZE) return false;

    const positions = [];
    let index = 0;
    for (const char of text) {
      if (INVISIBLE_CHARS.includes(char)) {
        positions.push(index);
      }
      index++;
    }

    if (positions.length < MIN_CLUSTER_SIZE) return false;

    let clusteredCount = 0;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] - positions[i - 1] < CLUSTER_DISTANCE) {
        clusteredCount++;
      }
    }

    return clusteredCount / positions.length > CLUSTER_RATIO_THRESHOLD;
  }

  /**
   * Check if text likely contains an encoded message
   */
  function isLikelyEncodedMessage(text) {
    const matches = text.match(invisibleCharRegex);

    if (!matches || matches.length < MIN_INVISIBLE_CHAR_COUNT) {
      return false;
    }

    const ratio = matches.length / text.length;

    if (ratio < SPARSE_RATIO_THRESHOLD && matches.length < SPARSE_COUNT_THRESHOLD) {
      return false;
    }

    const isClustered = areClustered(text, matches);

    if (matches.length < HIGH_COUNT_THRESHOLD && !isClustered) {
      return false;
    }

    if (ratio > MAX_INVISIBLE_RATIO || matches.length > HIGH_COUNT_THRESHOLD) {
      return true;
    }

    return isClustered;
  }

  /**
   * Check if text has complete encoded message (between delimiters)
   */
  function hasCompleteEncodedMessage(text) {
    if (!text) return false;

    const delimiterChar = '﻿';
    const firstDelimIndex = text.indexOf(delimiterChar);
    if (firstDelimIndex === -1) return false;

    const secondDelimIndex = text.indexOf(delimiterChar, firstDelimIndex + 1);
    if (secondDelimIndex === -1) return false;

    const betweenDelimiters = text.substring(firstDelimIndex + 1, secondDelimIndex);
    if (betweenDelimiters.length === 0) return false;

    const invisibleCharsOnly = INVISIBLE_CHARS.filter(c => c !== '﻿');
    const hasOnlyInvisible = [...betweenDelimiters].every(c => invisibleCharsOnly.includes(c));

    return hasOnlyInvisible;
  }

  /**
   * Extract complete text from node (same strategy as content script)
   */
  function extractCompleteText(node) {
    const nodeText = node.data || node.nodeValue || node.textContent || '';
    if (nodeText && hasCompleteEncodedMessage(nodeText)) {
      return nodeText;
    }

    if (node.parentElement) {
      const parentText = node.parentElement.textContent || '';
      if (parentText && hasCompleteEncodedMessage(parentText)) {
        return parentText;
      }
    }

    let currentElement = node.parentElement;
    let levelsChecked = 0;
    const MAX_PARENT_LEVELS = 10;

    while (currentElement && levelsChecked < MAX_PARENT_LEVELS) {
      let combinedText = '';
      const walker = document.createTreeWalker(currentElement, NodeFilter.SHOW_TEXT, null);
      let textNode;
      while ((textNode = walker.nextNode())) {
        combinedText += textNode.data || textNode.nodeValue || '';
      }

      if (combinedText && hasCompleteEncodedMessage(combinedText)) {
        return combinedText;
      }

      currentElement = currentElement.parentElement;
      levelsChecked++;
    }

    return nodeText || '';
  }

  /**
   * Detect platform
   */
  function detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();

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

  /**
   * Scan page for hidden messages
   */
  function scanPage() {
    const foundMessages = [];
    const processedElements = new Set();

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;

    while ((node = walker.nextNode())) {
      const text = node.data || node.nodeValue || '';
      if (text && isLikelyEncodedMessage(text)) {
        const element = node.parentElement;
        if (element && !processedElements.has(element)) {
          const completeText = extractCompleteText(node);

          foundMessages.push({
            element,
            text: completeText,
            platform: detectPlatform()
          });

          processedElements.add(element);
        }
      }
    }

    return foundMessages;
  }

  /**
   * Create reveal button for detected message
   */
  function createRevealButton(message, elementId) {
    const button = document.createElement('button');
    button.className = 'ghostpost-reveal-btn';
    button.innerHTML = '🔓 Reveal';
    button.title = 'Click to reveal hidden message';
    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: 2px solid #667eea;
      border-radius: 6px;
      padding: 8px 14px;
      margin: 8px 0;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.3s ease;
      display: inline-block;
    `;

    button.onmouseover = () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    };

    button.onmouseout = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
    };

    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      revealMessage(message);
    };

    return button;
  }

  /**
   * Reveal message by opening decode page
   */
  function revealMessage(message) {
    const encodedText = encodeURIComponent(message.text);
    const decodeUrl = `${config.apiBase}/decode?text=${encodedText}`;
    window.open(decodeUrl, '_blank');
  }

  /**
   * Inject reveal buttons for detected messages
   */
  function injectRevealButtons(messages) {
    messages.forEach((msg, idx) => {
      const elementId = `ghostpost-msg-${Date.now()}-${idx}`;

      // Skip if already injected
      if (detectedMessages.has(elementId)) return;

      detectedMessages.set(elementId, msg);

      // Create and inject button
      const button = createRevealButton(msg, elementId);

      try {
        if (msg.element && msg.element.parentNode) {
          msg.element.parentNode.insertBefore(button, msg.element.nextSibling);
        }
      } catch (e) {
        console.log('[Ghostpost] Could not inject button:', e);
      }
    });
  }

  /**
   * Perform initial scan
   */
  function performScan() {
    const messages = scanPage();
    if (messages.length > 0) {
      console.log(`[Ghostpost] Found ${messages.length} hidden messages`);
      injectRevealButtons(messages);

      if (config.enableNotifications && messages.length > 0) {
        GM_notification({
          title: '👻 Ghostpost',
          text: `Found ${messages.length} hidden message${messages.length > 1 ? 's' : ''}`,
          timeout: 5000
        });
      }
    }
  }

  /**
   * Handle mutations for dynamic content
   */
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
              shouldScan = true;
              break;
            }
          }
        }
      }

      if (shouldScan) {
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(performScan, config.debounceMs);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Initialize userscript
   */
  function init() {
    console.log('[Ghostpost] Initializing message detector');

    // Initial scan
    performScan();

    // Setup mutation observer for dynamic content
    setupMutationObserver();

    // Periodic scan for social media (infinite scroll)
    const platform = detectPlatform();
    if (['x', 'reddit', 'facebook', 'instagram', 'tiktok'].includes(platform)) {
      setInterval(performScan, config.scanIntervalMs);
      console.log(`[Ghostpost] Enhanced monitoring enabled for ${platform}`);
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose API for debugging
  window.ghostpost = {
    scan: performScan,
    config,
    messages: detectedMessages
  };

  console.log('[Ghostpost] Userscript loaded - type window.ghostpost.scan() to rescan');
})();
