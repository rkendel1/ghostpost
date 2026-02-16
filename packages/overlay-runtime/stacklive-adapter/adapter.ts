/**
 * StackLive Adapter
 * 
 * Main integration adapter that connects pattern detection, overlay states,
 * and StackLive runtime. This is the primary entry point for StackLive integration.
 */

import { detectPattern, hasCompleteEncodedMessage, type DetectionResult } from '../pattern-detector/detector';
import { overlayStateMachine, type OverlayState } from '../overlay-core/overlayStateMachine';
import { runtimeBridge, type ExperienceContext } from '../overlay-core/stackliveRuntimeBridge';

export interface StackLiveConfig {
  apiUrl?: string;
  enableAnalytics?: boolean;
  debugMode?: boolean;
  autoLaunch?: boolean;
}

export interface DetectionEvent {
  type: 'PATTERN_DETECTED' | 'EXPERIENCE_RESOLVED' | 'RUNTIME_LAUNCHED' | 'RUNTIME_COMPLETE';
  text?: string;
  detection?: DetectionResult;
  experienceId?: string;
  state?: OverlayState;
  timestamp: number;
}

export type DetectionEventListener = (event: DetectionEvent) => void;

class StackLiveAdapter {
  private config: StackLiveConfig;
  private listeners: Set<DetectionEventListener> = new Set();
  private initialized = false;

  constructor(config: StackLiveConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://stacklive.dev',
      enableAnalytics: config.enableAnalytics ?? true,
      debugMode: config.debugMode ?? false,
      autoLaunch: config.autoLaunch ?? true,
    };
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Set up state change listener
    overlayStateMachine.onStateChange((stateData) => {
      if (this.config.debugMode) {
        console.log('[StackLive] State changed:', stateData);
      }
    });

    // Set up runtime bridge event listener
    runtimeBridge.addEventListener((event) => {
      if (this.config.debugMode) {
        console.log('[StackLive] Runtime event:', event);
      }
    });

    this.initialized = true;

    if (this.config.debugMode) {
      console.log('[StackLive] Adapter initialized');
    }
  }

  /**
   * Register event listener
   */
  addEventListener(listener: DetectionEventListener): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit detection event to all listeners
   */
  private emitEvent(event: DetectionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[StackLive] Error in event listener:', error);
      }
    });
  }

  /**
   * Scan text for patterns and handle detection
   */
  async scanText(text: string, metadata?: Record<string, unknown>): Promise<DetectionResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const detection = detectPattern(text);

    if (!detection.detected) {
      return null;
    }

    // Update overlay state
    overlayStateMachine.onPatternDetected();

    // Emit pattern detected event
    this.emitEvent({
      type: 'PATTERN_DETECTED',
      text,
      detection,
      state: overlayStateMachine.getState(),
      timestamp: Date.now(),
    });

    if (this.config.debugMode) {
      console.log('[StackLive] Pattern detected:', detection);
    }

    // Check if we have a complete message
    if (detection.hasCompleteMessage) {
      await this.resolveExperience(text, metadata);
    }

    return detection;
  }

  /**
   * Resolve experience from detected pattern
   */
  private async resolveExperience(text: string, metadata?: Record<string, unknown>): Promise<void> {
    // Extract experience ID from text
    // For GhostPost, the experience ID is embedded in the encoded message
    const experienceId = this.extractExperienceId(text);

    if (!experienceId) {
      if (this.config.debugMode) {
        console.log('[StackLive] No experience ID found in text');
      }
      return;
    }

    // Update overlay state
    overlayStateMachine.onExperienceResolved();

    // Emit experience resolved event
    this.emitEvent({
      type: 'EXPERIENCE_RESOLVED',
      experienceId,
      state: overlayStateMachine.getState(),
      timestamp: Date.now(),
    });

    // Auto-launch if enabled
    if (this.config.autoLaunch) {
      await this.launchExperience(experienceId, { metadata });
    }
  }

  /**
   * Extract experience ID from encoded text
   */
  private extractExperienceId(text: string): string | null {
    // Look for ||stacklive: or ||ghostid: delimiter
    const stackliveMatch = text.match(/\|\|stacklive:([^|]+)/);
    const ghostMatch = text.match(/\|\|ghostid:([^|]+)/);
    
    if (stackliveMatch) {
      return stackliveMatch[1];
    }
    
    if (ghostMatch) {
      return ghostMatch[1];
    }

    // Fallback: generate ID from text hash
    return this.generateIdFromText(text);
  }

  /**
   * Generate experience ID from text content
   */
  private generateIdFromText(text: string): string {
    // Simple hash function for demo purposes
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `exp_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Launch StackLive experience
   */
  async launchExperience(experienceId: string, context: Partial<ExperienceContext> = {}): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Update overlay state
    overlayStateMachine.onRuntimeLaunched();

    // Emit runtime launched event
    this.emitEvent({
      type: 'RUNTIME_LAUNCHED',
      experienceId,
      state: overlayStateMachine.getState(),
      timestamp: Date.now(),
    });

    // Launch via runtime bridge
    await runtimeBridge.launchExperience(experienceId, {
      experienceId,
      detectedAt: Date.now(),
      ...context,
    });

    if (this.config.debugMode) {
      console.log('[StackLive] Experience launched:', experienceId);
    }
  }

  /**
   * Complete runtime and reset state
   */
  completeRuntime(): void {
    overlayStateMachine.onRuntimeComplete();

    this.emitEvent({
      type: 'RUNTIME_COMPLETE',
      state: overlayStateMachine.getState(),
      timestamp: Date.now(),
    });

    if (this.config.debugMode) {
      console.log('[StackLive] Runtime complete');
    }
  }

  /**
   * Get current overlay state
   */
  getState(): OverlayState {
    return overlayStateMachine.getState();
  }

  /**
   * Get state UI representation
   */
  getStateUI() {
    return overlayStateMachine.getStateUI();
  }

  /**
   * Reset adapter to idle state
   */
  reset(): void {
    overlayStateMachine.reset();
  }
}

// Export singleton instance
export const stackliveAdapter = new StackLiveAdapter({
  debugMode: typeof window !== 'undefined' && window.location.hostname === 'localhost',
});

// Export class for custom instances
export { StackLiveAdapter };

// Export convenient helper functions
export async function scanForStackLive(text: string, metadata?: Record<string, unknown>): Promise<DetectionResult | null> {
  return stackliveAdapter.scanText(text, metadata);
}

export async function launchStackLiveExperience(experienceId: string, context?: Partial<ExperienceContext>): Promise<void> {
  return stackliveAdapter.launchExperience(experienceId, context);
}
