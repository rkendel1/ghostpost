/**
 * Overlay State Machine
 * 
 * Manages overlay states and transitions for StackLive integration.
 * States: idle → signal detected → experience available → runtime active
 */

export type OverlayState = 'idle' | 'signal_detected' | 'experience_available' | 'runtime_active';

export interface StateTransition {
  from: OverlayState;
  to: OverlayState;
  timestamp: number;
  trigger?: string;
}

export interface OverlayStateData {
  state: OverlayState;
  detectionCount: number;
  lastTransition?: StateTransition;
  metadata?: Record<string, unknown>;
}

export type StateChangeListener = (data: OverlayStateData) => void;

class OverlayStateMachine {
  private currentState: OverlayState = 'idle';
  private detectionCount = 0;
  private listeners: Set<StateChangeListener> = new Set();
  private stateHistory: StateTransition[] = [];

  /**
   * Get current overlay state
   */
  getState(): OverlayState {
    return this.currentState;
  }

  /**
   * Get current state data
   */
  getStateData(): OverlayStateData {
    return {
      state: this.currentState,
      detectionCount: this.detectionCount,
      lastTransition: this.stateHistory[this.stateHistory.length - 1],
    };
  }

  /**
   * Register state change listener
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Transition to a new state
   */
  private transition(to: OverlayState, trigger?: string): void {
    const from = this.currentState;
    
    if (from === to) {
      return; // No state change
    }

    const transition: StateTransition = {
      from,
      to,
      timestamp: Date.now(),
      trigger,
    };

    this.currentState = to;
    this.stateHistory.push(transition);

    // Keep history limited to last 50 transitions
    if (this.stateHistory.length > 50) {
      this.stateHistory.shift();
    }

    // Notify listeners
    const stateData = this.getStateData();
    this.listeners.forEach(listener => {
      try {
        listener(stateData);
      } catch (error) {
        console.error('[OverlayState] Error in listener:', error);
      }
    });
  }

  /**
   * Handle pattern detection - transition to signal_detected
   */
  onPatternDetected(): void {
    this.detectionCount++;
    
    if (this.currentState === 'idle') {
      this.transition('signal_detected', 'pattern_detected');
    }
  }

  /**
   * Handle experience resolved - transition to experience_available
   */
  onExperienceResolved(): void {
    if (this.currentState === 'signal_detected') {
      this.transition('experience_available', 'experience_resolved');
    }
  }

  /**
   * Handle runtime launch - transition to runtime_active
   */
  onRuntimeLaunched(): void {
    if (this.currentState === 'experience_available') {
      this.transition('runtime_active', 'runtime_launched');
    }
  }

  /**
   * Handle runtime complete - transition back to idle
   */
  onRuntimeComplete(): void {
    if (this.currentState === 'runtime_active') {
      this.transition('idle', 'runtime_complete');
      this.detectionCount = 0; // Reset detection count
    }
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.transition('idle', 'manual_reset');
    this.detectionCount = 0;
  }

  /**
   * Get state transition history
   */
  getHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Get visual representation of current state
   */
  getStateUI(): {
    icon: string;
    color: string;
    description: string;
    pulsing: boolean;
  } {
    switch (this.currentState) {
      case 'idle':
        return {
          icon: 'orb',
          color: '#9ca3af', // gray
          description: 'Monitoring for signals',
          pulsing: false,
        };
      
      case 'signal_detected':
        return {
          icon: 'orb',
          color: '#667eea', // purple
          description: 'Signal detected',
          pulsing: true,
        };
      
      case 'experience_available':
        return {
          icon: 'orb-ring',
          color: '#10b981', // green
          description: 'Experience ready',
          pulsing: false,
        };
      
      case 'runtime_active':
        return {
          icon: 'panel',
          color: '#667eea', // purple
          description: 'Experience active',
          pulsing: false,
        };
      
      default:
        return {
          icon: 'orb',
          color: '#9ca3af',
          description: 'Unknown state',
          pulsing: false,
        };
    }
  }
}

// Export singleton instance
export const overlayStateMachine = new OverlayStateMachine();

// Export class for custom instances
export { OverlayStateMachine };
