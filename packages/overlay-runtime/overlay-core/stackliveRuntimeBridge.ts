/**
 * StackLive Runtime Bridge
 * 
 * Integration layer between GhostPost detection/decoding and StackLive runtime.
 * Emits EXPERIENCE_DETECTED events and manages runtime lifecycle.
 */

export interface ExperienceContext {
  experienceId: string;
  detectedAt: number;
  position?: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

export interface RuntimeConfig {
  apiUrl?: string;
  enableAnalytics?: boolean;
  debugMode?: boolean;
}

export interface ExperienceDetectedEvent {
  type: 'EXPERIENCE_DETECTED';
  experienceId: string;
  context: ExperienceContext;
  timestamp: number;
}

export type RuntimeEventListener = (event: ExperienceDetectedEvent) => void;

class StackLiveRuntimeBridge {
  private listeners: Set<RuntimeEventListener> = new Set();
  private config: RuntimeConfig;
  private runtimeLoaded = false;

  constructor(config: RuntimeConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://stacklive.dev',
      enableAnalytics: config.enableAnalytics ?? true,
      debugMode: config.debugMode ?? false,
    };
  }

  /**
   * Register an event listener for EXPERIENCE_DETECTED events
   */
  addEventListener(listener: RuntimeEventListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit EXPERIENCE_DETECTED event to all registered listeners
   */
  emitExperienceDetected(experienceId: string, context: Partial<ExperienceContext> = {}): void {
    const event: ExperienceDetectedEvent = {
      type: 'EXPERIENCE_DETECTED',
      experienceId,
      context: {
        experienceId,
        detectedAt: Date.now(),
        ...context,
      },
      timestamp: Date.now(),
    };

    if (this.config.debugMode) {
      console.log('[StackLive] EXPERIENCE_DETECTED:', event);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[StackLive] Error in event listener:', error);
      }
    });
  }

  /**
   * Load StackLive runtime (lazy loading)
   */
  async loadRuntime(): Promise<void> {
    if (this.runtimeLoaded) {
      return;
    }

    if (this.config.debugMode) {
      console.log('[StackLive] Loading runtime...');
    }

    // TODO: Implement actual runtime loading
    // This is a placeholder for StackLive runtime integration
    // In production, this would:
    // 1. Load StackLive runtime SDK
    // 2. Initialize with config
    // 3. Set up authentication
    
    this.runtimeLoaded = true;

    if (this.config.debugMode) {
      console.log('[StackLive] Runtime loaded successfully');
    }
  }

  /**
   * Launch a StackLive experience
   */
  async launchExperience(experienceId: string, context: ExperienceContext): Promise<void> {
    await this.loadRuntime();

    if (this.config.debugMode) {
      console.log('[StackLive] Launching experience:', experienceId, context);
    }

    // TODO: Implement actual experience launch
    // This is a placeholder for StackLive runtime integration
    // In production, this would:
    // 1. Verify user session
    // 2. Fetch experience manifest
    // 3. Mount experience UI
    // 4. Handle experience lifecycle

    // For now, we just emit the detection event
    this.emitExperienceDetected(experienceId, context);
  }

  /**
   * Check if runtime is loaded
   */
  isRuntimeLoaded(): boolean {
    return this.runtimeLoaded;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<RuntimeConfig> {
    return { ...this.config };
  }
}

// Export singleton instance
export const runtimeBridge = new StackLiveRuntimeBridge({
  debugMode: typeof window !== 'undefined' && window.location.hostname === 'localhost',
});

// Export for custom instances
export { StackLiveRuntimeBridge };

// Helper function for easy integration
export async function launchExperience(experienceId: string, context: Partial<ExperienceContext> = {}): Promise<void> {
  const fullContext: ExperienceContext = {
    experienceId,
    detectedAt: Date.now(),
    ...context,
  };
  
  await runtimeBridge.launchExperience(experienceId, fullContext);
}
