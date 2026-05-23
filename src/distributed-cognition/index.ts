export type { NodeTrust, PartitionTrust } from './ClusterTrustManager.js';
export { ClusterTrustManager } from './ClusterTrustManager.js';

export type { ConsensusHealthSnapshot, ConsensusAnomaly } from './ConsensusHealthMonitor.js';
export { ConsensusHealthMonitor } from './ConsensusHealthMonitor.js';

export type { RecoveryAction, RecoveryPlan } from './DistributedRecoveryCoordinator.js';
export { DistributedRecoveryCoordinator } from './DistributedRecoveryCoordinator.js';

export type { DistributedLoopObservation, DistributedLoopState } from './DistributedCognitiveLoop.js';
export { DistributedCognitiveLoop } from './DistributedCognitiveLoop.js';

// v6.0 — Decoupled Cognitive Architecture
export type {
  CognitiveExecutionRuntime,
  ClusterHealthSnapshot,
  CycleResult,
  DeterministicState,
} from './CognitiveExecutionRuntime.js';

export type { DistributedExecutionRuntimeOptions } from './DistributedExecutionRuntime.js';
export { DistributedExecutionRuntime } from './DistributedExecutionRuntime.js';

export type {
  CognitiveStrategy,
  AdaptiveLoopDecision,
  AdaptiveLoopConfig,
} from './AdaptiveCognitiveLoop.js';
export { AdaptiveCognitiveLoop } from './AdaptiveCognitiveLoop.js';
