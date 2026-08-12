/**
 * StackLive Overlay Runtime
 * 
 * Main entry point for StackLive overlay integration.
 * Provides pattern detection, overlay state management, and runtime bridge.
 */

// Main adapter
export { 
  StackLiveAdapter, 
  stackliveAdapter,
  scanForStackLive,
  launchStackLiveExperience,
  type StackLiveConfig,
  type DetectionEvent,
  type DetectionEventListener,
} from './stacklive-adapter/adapter';

// Pattern detector
export {
  detectPattern,
  isLikelyHidenlyMessage,
  hasCompleteEncodedMessage,
  scanForPatterns,
  DETECTOR_CONSTANTS,
  type DetectionResult,
} from './pattern-detector/detector';

// Overlay state machine
export {
  OverlayStateMachine,
  overlayStateMachine,
  type OverlayState,
  type StateTransition,
  type OverlayStateData,
  type StateChangeListener,
} from './overlay-core/overlayStateMachine';

// Runtime bridge
export {
  StackLiveRuntimeBridge,
  runtimeBridge,
  launchExperience,
  type ExperienceContext,
  type RuntimeConfig,
  type ExperienceDetectedEvent,
  type RuntimeEventListener,
} from './overlay-core/stackliveRuntimeBridge';
