// ==UserScript==
// @name         Ghostpost Reveal
// @namespace    https://ghostpost-six.vercel.app
// @version      1.0.1
// @description  Reveal hidden Ghostpost messages on any webpage with one click
// @author       Ghostpost
// @match        *://*/*
// @exclude      *://*/login*
// @exclude      *://*/signin*
// @exclude      *://*/banking*
// @exclude      *://*/account*
// @exclude      *://*.bank.*/*
// @exclude      *://*.paypal.*/*
// @grant        none
// @updateURL    https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// @downloadURL  https://ghostpost-six.vercel.app/ghostpost-reveal.user.js
// ==/UserScript==

/**
 * Ghostpost Reveal Userscript
 * 
 * Security & Privacy Notes:
 * - All processing happens locally in your browser
 * - No data is sent to external servers during detection
 * - Only extracts text when you explicitly click the reveal button
 * - Common sensitive domains (banking, login) are excluded
 * - Uses DOM manipulation only, no eval() or dynamic code execution
 */

(function() {
    'use strict';

    // Configuration
    const DECODE_API_URL = 'https://ghostpost-six.vercel.app/decode';
    const BUTTON_ID = 'ghostpost-reveal-button';
    
    // Check if button already exists
    if (document.getElementById(BUTTON_ID)) {
        return;
    }

    // Create floating reveal button using DOM methods for security
    const button = document.createElement('div');
    button.id = BUTTON_ID;
    
    const container = document.createElement('div');
    container.style.cssText = 'position: relative; width: 100%; height: 100%;';
    
    const ghost = document.createElement('span');
    ghost.textContent = '👻';
    ghost.style.fontSize = '32px';
    
    const counter = document.createElement('span');
    counter.id = 'ghostpost-counter';
    counter.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        font-size: 12px;
        font-weight: bold;
        display: none;
        align-items: center;
        justify-content: center;
    `;
    
    container.appendChild(ghost);
    container.appendChild(counter);
    button.appendChild(container);
    
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    // Hover effect
    button.onmouseenter = () => {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
    };
    button.onmouseleave = () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    };

    // Function to detect hidden messages
    function detectHiddenMessages() {
        const invisibleChars = /[\u200B\u200C\u200D\u2060\uFEFF\u180E]/g;
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent && invisibleChars.test(node.textContent)) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    // Function to update counter
    function updateCounter() {
        const hiddenMessages = detectHiddenMessages();
        const counter = document.getElementById('ghostpost-counter');
        
        if (hiddenMessages.length > 0) {
            counter.textContent = hiddenMessages.length;
            counter.style.display = 'flex';
            button.style.animation = 'pulse 2s infinite';
            
            // Add pulse animation
            if (!document.getElementById('ghostpost-pulse-style')) {
                const style = document.createElement('style');
                style.id = 'ghostpost-pulse-style';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
                        50% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            counter.style.display = 'none';
            button.style.animation = 'none';
        }
    }

    // Function to reveal all hidden messages
    function revealMessages() {
        const hiddenMessages = detectHiddenMessages();
        
        if (hiddenMessages.length === 0) {
            showNotification('No hidden messages found on this page', 'info');
            return;
        }

        // Extract text from nodes containing hidden messages only
        let extractedText = '';
        hiddenMessages.forEach(node => {
            // Get parent element text to include context
            const parent = node.parentElement;
            if (parent) {
                extractedText += parent.innerText + '\n\n';
            }
        });
        
        // Limit text size to prevent URL length issues (max ~8KB)
        const maxLength = 8000;
        if (extractedText.length > maxLength) {
            extractedText = extractedText.substring(0, maxLength);
            showNotification('Note: Text truncated due to size. Some messages may not be included.', 'info');
        }
        
        // Open decode page with the text
        const encodedText = encodeURIComponent(extractedText);
        const decodeUrl = `${DECODE_API_URL}?text=${encodedText}`;
        
        // Open in new window
        window.open(decodeUrl, '_blank', 'width=800,height=600');
        
        showNotification(`Found ${hiddenMessages.length} hidden message(s)! Opening decoder...`, 'success');
    }

    // Function to show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Click handler
    button.onclick = revealMessages;

    // Add button to page
    document.body.appendChild(button);

    // Initial counter update
    updateCounter();

    // Monitor for dynamic content changes
    const observer = new MutationObserver(() => {
        updateCounter();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log('Ghostpost Reveal extension loaded! Click the 👻 button to reveal hidden messages.');
})();
