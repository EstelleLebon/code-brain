import type {
  CognitiveExecutionRuntime,
  ClusterHealthSnapshot,
  CycleResult,
  DeterministicState,
} from './CognitiveExecutionRuntime.js';

/**
 * Mono-node implementation of CognitiveExecutionRuntime.
 * Zero cluster dependencies — deterministic, replayable, suitable for unit tests
 * and single-agent deployments.
 */
export class LocalExecutionRuntime implements CognitiveExecutionRuntime {
  private logicalClock = 0;
  private iteration = 0;
  private aggression = 0.7;
  private stableIterations = 0;
  private consecutiveFailures = 0;
  private rebalancePending = false;

  // Deterministic per-node trust: key → score [0, 1]
  private nodeTrust: Map<string, number> = new Map();
  // Pending recovery requests
  private recoveryLog: Array<{ nodeId: string; reason: string; clock: number }> = [];

  executeCycle(nodeIds: string[]): CycleResult {
    this.logicalClock++;
    this.iteration++;

    const executionId = `local-exec-${this.iteration}`;
    const affectedNodes: string[] = [];
    let recoveryTriggered = false;

    for (const nodeId of nodeIds) {
      if (!this.nodeTrust.has(nodeId)) this.nodeTrust.set(nodeId, 1.0);
    }

    // Deterministic outcome: trust-weighted, no randomness
    for (const nodeId of nodeIds) {
      const trust = this.nodeTrust.get(nodeId) ?? 1.0;
      const outcome = this.resolveLocalOutcome(trust);
      if (outcome !== 'success') {
        affectedNodes.push(nodeId);
        // Degrade trust deterministically
        this.nodeTrust.set(nodeId, Math.max(0, trust - 0.05));
      } else {
        // Recover trust gradually on success
        this.nodeTrust.set(nodeId, Math.min(1.0, trust + 0.02));
      }
    }

    // Adapt aggression
    if (affectedNodes.length === 0) {
      this.stableIterations++;
      this.consecutiveFailures = 0;
      if (this.stableIterations >= 3) {
        this.aggression = Math.min(1.0, this.aggression + 0.05);
      }
    } else {
      this.stableIterations = 0;
      this.consecutiveFailures++;
      this.aggression = Math.max(0.0, this.aggression - 0.1);
    }

    // Trigger recovery when trust falls below threshold
    const avgTrust = this.computeAvgTrust(nodeIds);
    if (avgTrust < 0.4 && this.recoveryLog.length > 0) {
      recoveryTriggered = true;
    }

    const outcome: CycleResult['outcome'] =
      avgTrust < 0.4 ? 'degraded' :
      affectedNodes.length > 0 ? 'failure' :
      'success';

    return {
      executionId,
      iteration: this.iteration,
      outcome,
      affectedNodes,
      recoveryTriggered,
    };
  }

  recoverNode(nodeId: string, reason: string): boolean {
    this.logicalClock++;
    this.recoveryLog.push({ nodeId, reason, clock: this.logicalClock });
    // Restore trust to a safe baseline deterministically
    const current = this.nodeTrust.get(nodeId) ?? 0;
    this.nodeTrust.set(nodeId, Math.max(current, 0.5));
    return true;
  }

  synchronizeCluster(nodeIds: string[]): void {
    this.logicalClock++;
    this.rebalancePending = false;

    // In local mode: normalize trust across all nodes toward mean
    if (nodeIds.length === 0) return;
    const values = nodeIds.map(id => this.nodeTrust.get(id) ?? 1.0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    for (const nodeId of nodeIds) {
      const current = this.nodeTrust.get(nodeId) ?? 1.0;
      // Converge 10% toward mean per sync
      this.nodeTrust.set(nodeId, current + (mean - current) * 0.1);
    }
  }

  getClusterHealth(): ClusterHealthSnapshot {
    const scores = [...this.nodeTrust.values()];
    const globalTrust = scores.length === 0 ? 1.0 :
      scores.reduce((a, b) => a + b, 0) / scores.length;
    const unstableCount = scores.filter(s => s < 0.5).length;
    const quarantinedCount = scores.filter(s => s < 0.2).length;

    return {
      globalTrust,
      consensusHealth: globalTrust, // single-node: consensus == trust
      activeRecoveryPlans: this.recoveryLog.length,
      unstableNodeCount: unstableCount,
      quarantinedNodeCount: quarantinedCount,
    };
  }

  getDeterministicState(): DeterministicState {
    return {
      logicalClock: this.logicalClock,
      iteration: this.iteration,
      aggression: this.aggression,
      stableIterations: this.stableIterations,
      rebalancePending: this.rebalancePending,
    };
  }

  reset(): void {
    this.logicalClock = 0;
    this.iteration = 0;
    this.aggression = 0.7;
    this.stableIterations = 0;
    this.consecutiveFailures = 0;
    this.rebalancePending = false;
    this.nodeTrust.clear();
    this.recoveryLog = [];
  }

  // ── Internals ────────────────────────────────────────────────────────────────

  private resolveLocalOutcome(trust: number): 'success' | 'failure' | 'timeout' | 'partition' {
    if (trust >= 0.8) return 'success';
    if (trust >= 0.6) return 'success'; // still succeeds but heading toward threshold
    if (trust >= 0.4) return 'timeout';
    if (trust >= 0.2) return 'failure';
    return 'partition';
  }

  private computeAvgTrust(nodeIds: string[]): number {
    if (nodeIds.length === 0) return 1.0;
    const sum = nodeIds.reduce((acc, id) => acc + (this.nodeTrust.get(id) ?? 1.0), 0);
    return sum / nodeIds.length;
  }
}
