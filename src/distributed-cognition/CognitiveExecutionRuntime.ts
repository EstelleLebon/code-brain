export interface ClusterHealthSnapshot {
  globalTrust: number;
  consensusHealth: number;
  activeRecoveryPlans: number;
  unstableNodeCount: number;
  quarantinedNodeCount: number;
}

export interface CycleResult {
  executionId: string;
  iteration: number;
  outcome: 'success' | 'failure' | 'timeout' | 'partition' | 'degraded';
  affectedNodes: string[];
  recoveryTriggered: boolean;
}

export interface DeterministicState {
  logicalClock: number;
  iteration: number;
  aggression: number;
  stableIterations: number;
  rebalancePending: boolean;
}

/**
 * Contracts for distributed execution: decouples strategy from cluster mechanics.
 * AdaptiveCognitiveLoop depends on this — never on ClusterTrustManager, vector clocks,
 * replay engines, or consensus directly.
 */
export interface CognitiveExecutionRuntime {
  /** Run one distributed cognitive cycle and return a structured outcome. */
  executeCycle(nodeIds: string[]): CycleResult;

  /** Trigger targeted recovery for a specific node. */
  recoverNode(nodeId: string, reason: string): boolean;

  /** Synchronize cluster state (replay, reconciliation, rebalance). */
  synchronizeCluster(nodeIds: string[]): void;

  /** Return a health snapshot without side effects. */
  getClusterHealth(): ClusterHealthSnapshot;

  /** Return current deterministic runtime state (no hashing, no crypto). */
  getDeterministicState(): DeterministicState;

  /** Reset all internal state for deterministic replay. */
  reset(): void;
}
