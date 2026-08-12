/**
 * StackLive Overlay Web Component
 * 
 * A configurable web component that provides automatic detection and reveal
 * functionality for hidden GhostPost messages.
 * 
 * Usage:
 * <stacklive-overlay 
 *   position="bottom-right"
 *   auto-scan="true"
 *   theme="dark"
 *   scan-interval="2000">
 * </stacklive-overlay>
 */

import { 
  initStackLive,
  scanForExperiences,
  decodeForStackLive,
  onExperienceDetected,
  getOverlayStateUI
} from '../stacklive-integration.ts';

class StackLiveOverlay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.foundExperiences = [];
    this.scanInterval = null;
    this.isRevealing = false;
  }

  static get observedAttributes() {
    return ['position', 'auto-scan', 'theme', 'scan-interval', 'show-badge'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Initialize StackLive
    initStackLive().then(() => {
      console.log('[StackLive Overlay] Initialized');
      
      // Start auto-scanning if enabled
      if (this.getAttribute('auto-scan') === 'true') {
        this.startAutoScan();
      }
    });
  }

  disconnectedCallback() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const position = this.getAttribute('position') || 'bottom-right';
    const theme = this.getAttribute('theme') || 'dark';
    const showBadge = this.getAttribute('show-badge') !== 'false';
    
    const positionStyles = {
      'top-left': 'top: 20px; left: 20px;',
      'top-right': 'top: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;'
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: ${theme === 'dark' ? '#667eea' : '#5568d3'};
          --bg-color: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'};
          --text-color: ${theme === 'dark' ? '#ffffff' : '#333333'};
          --badge-color: #ef4444;
        }

        .overlay-button {
          position: fixed;
          ${positionStyles[position]}
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary-color);
          color: var(--text-color);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: transform 0.2s, box-shadow 0.2s;
          z-index: 999999;
        }

        .overlay-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        .overlay-button.pulsing {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--badge-color);
          color: white;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
          font-weight: bold;
          min-width: 20px;
          text-align: center;
        }

        .panel {
          position: fixed;
          ${positionStyles[position]}
          width: 320px;
          max-height: 400px;
          background: var(--bg-color);
          color: var(--text-color);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          padding: 20px;
          z-index: 999998;
          overflow-y: auto;
          transform: translateY(10px);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.3s, opacity 0.3s;
        }

        .panel.visible {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }

        .panel h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .experience-item {
          background: ${theme === 'dark' ? '#2a2a3e' : '#f5f5f5'};
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .experience-item button {
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 8px;
        }

        .experience-item button:hover {
          opacity: 0.9;
        }

        .no-experiences {
          text-align: center;
          padding: 20px;
          color: #999;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: var(--text-color);
          font-size: 24px;
          cursor: pointer;
          opacity: 0.6;
        }

        .close-button:hover {
          opacity: 1;
        }
      </style>

      <button class="overlay-button" id="overlayBtn" title="Reveal hidden messages">
        👻
        ${showBadge ? '<span class="badge" id="badge" style="display: none;">0</span>' : ''}
      </button>

      <div class="panel" id="panel">
        <button class="close-button" id="closeBtn">×</button>
        <h3>Hidden Messages</h3>
        <div id="experiencesList">
          <div class="no-experiences">No hidden messages found on this page</div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const button = this.shadowRoot.getElementById('overlayBtn');
    const panel = this.shadowRoot.getElementById('panel');
    const closeBtn = this.shadowRoot.getElementById('closeBtn');

    button.addEventListener('click', () => {
      panel.classList.toggle('visible');
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('visible');
    });

    // Listen for experience detection events
    onExperienceDetected((event) => {
      if (event.type === 'PATTERN_DETECTED') {
        console.log('[StackLive Overlay] Pattern detected');
        this.updateVisualState();
      }
    });
  }

  async startAutoScan() {
    const interval = parseInt(this.getAttribute('scan-interval') || '2000');
    
    // Initial scan
    await this.scanPage();
    
    // Periodic scanning
    this.scanInterval = setInterval(() => {
      this.scanPage();
    }, interval);
  }

  async scanPage() {
    // Get all text content from page
    const textNodes = this.getTextNodes(document.body);
    const foundExperiences = [];

    for (const node of textNodes) {
      const text = node.textContent;
      if (text && text.length > 10) {
        const detection = await scanForExperiences(text);
        if (detection?.detected) {
          foundExperiences.push({
            text,
            node,
            detection
          });
        }
      }
    }

    if (foundExperiences.length > 0) {
      this.foundExperiences = foundExperiences;
      this.updateBadge();
      this.updateExperiencesList();
      this.updateVisualState();
    }
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim().length > 0) {
        textNodes.push(node);
      }
    }

    return textNodes;
  }

  updateBadge() {
    const badge = this.shadowRoot.getElementById('badge');
    if (badge) {
      if (this.foundExperiences.length > 0) {
        badge.textContent = this.foundExperiences.length;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  updateExperiencesList() {
    const list = this.shadowRoot.getElementById('experiencesList');
    
    if (this.foundExperiences.length === 0) {
      list.innerHTML = '<div class="no-experiences">No hidden messages found on this page</div>';
      return;
    }

    list.innerHTML = this.foundExperiences.map((exp, index) => `
      <div class="experience-item">
        <div><strong>Message ${index + 1}</strong></div>
        <div style="font-size: 12px; opacity: 0.7; margin: 4px 0;">
          ${exp.detection.charCount} invisible characters
        </div>
        <button onclick="this.getRootNode().host.revealExperience(${index})">
          Reveal Secret
        </button>
      </div>
    `).join('');
  }

  updateVisualState() {
    const button = this.shadowRoot.getElementById('overlayBtn');
    const stateUI = getOverlayStateUI();
    
    if (stateUI.pulsing) {
      button.classList.add('pulsing');
    } else {
      button.classList.remove('pulsing');
    }
  }

  async revealExperience(index) {
    if (this.isRevealing) return;
    
    this.isRevealing = true;
    const experience = this.foundExperiences[index];

    try {
      const decoded = await decodeForStackLive(experience.text, false);
      
      alert(`Secret Message:\n\n${decoded.message}\n\n${decoded.experienceId ? 'Experience ID: ' + decoded.experienceId : ''}`);
    } catch (error) {
      console.error('Failed to reveal:', error);
      alert('Failed to reveal message: ' + error.message);
    } finally {
      this.isRevealing = false;
    }
  }
}

// Register the custom element
customElements.define('stacklive-overlay', StackLiveOverlay);

export default StackLiveOverlay;
