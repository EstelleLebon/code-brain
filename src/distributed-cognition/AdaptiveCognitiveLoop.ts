import type {
  CognitiveExecutionRuntime,
  ClusterHealthSnapshot,
  CycleResult,
} from './CognitiveExecutionRuntime.js';
import type { EventStore } from '../event-store/EventStore.js';
import { createEvent } from '../event-store/CognitiveEvent.js';

export type CognitiveStrategy = 'aggressive' | 'balanced' | 'conservative' | 'recovery';

export interface AdaptiveLoopDecision {
  iteration: number;
  strategy: CognitiveStrategy;
  score: number;
  cycleResult: CycleResult;
  health: ClusterHealthSnapshot;
  adaptationReason: string;
}

export interface AdaptiveLoopConfig {
  aggressivenessTarget: number;
  healthThresholdDegraded: number;
  healthThresholdCritical: number;
  maxConsecutiveFailures: number;
}

const DEFAULT_CONFIG: AdaptiveLoopConfig = {
  aggressivenessTarget: 0.7,
  healthThresholdDegraded: 0.5,
  healthThresholdCritical: 0.3,
  maxConsecutiveFailures: 3,
};

/**
 * High-level adaptive strategy layer for distributed cognitive execution.
 * Responsible for: strategy selection, score computation, adaptation decisions.
 * Does NOT know about: replay, vector clocks, consensus, memory reconciliation.
 * All cluster mechanics are delegated to CognitiveExecutionRuntime.
 */
export class AdaptiveCognitiveLoop {
  private readonly runtime: CognitiveExecutionRuntime;
  private readonly config: AdaptiveLoopConfig;
  private eventStore?: EventStore;

  private iteration = 0;
  private strategy: CognitiveStrategy = 'balanced';
  private consecutiveFailures = 0;
  private scoreHistory: number[] = [];
  private decisions: AdaptiveLoopDecision[] = [];

  constructor(runtime: CognitiveExecutionRuntime, config: Partial<AdaptiveLoopConfig> = {}) {
    this.runtime = runtime;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Attach an EventStore to persist each AdaptiveLoopDecision as a replayable event. */
  attachEventStore(store: EventStore): void {
    this.eventStore = store;
  }

  /** Run one complete adaptive cycle against the given node list. */
  runCycle(nodeIds: string[]): AdaptiveLoopDecision {
    this.iteration++;

    // Synchronize cluster before execution
    this.runtime.synchronizeCluster(nodeIds);

    // Execute and get outcome
    const cycleResult = this.runtime.executeCycle(nodeIds);

    // Observe health
    const health = this.runtime.getClusterHealth();

    // Score this cycle
    const score = this.computeScore(cycleResult, health);
    this.scoreHistory.push(score);

    // Adapt strategy
    const { strategy, reason } = this.selectStrategy(cycleResult, health, score);
    this.strategy = strategy;

    // Track failures
    if (cycleResult.outcome === 'failure' || cycleResult.outcome === 'degraded') {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }

    const decision: AdaptiveLoopDecision = {
      iteration: this.iteration,
      strategy,
      score,
      cycleResult,
      health,
      adaptationReason: reason,
    };
    this.decisions.push(decision);
    this.persistDecision(decision);
    return decision;
  }

  private persistDecision(decision: AdaptiveLoopDecision): void {
    if (!this.eventStore) return;
    const event = createEvent({
      executionId: decision.cycleResult.executionId,
      eventType: 'adaptive:decision',
      payload: {
        iteration: decision.iteration,
        strategy: decision.strategy,
        score: decision.score,
        outcome: decision.cycleResult.outcome,
        adaptationReason: decision.adaptationReason,
        affectedNodes: decision.cycleResult.affectedNodes,
        recoveryTriggered: decision.cycleResult.recoveryTriggered,
        globalTrust: decision.health.globalTrust,
        consensusHealth: decision.health.consensusHealth,
      },
    });
    this.eventStore.append(event);
  }

  /** Recover a specific node without running a full cycle. */
  recoverNode(nodeId: string): boolean {
    return this.runtime.recoverNode(nodeId, `manual-recovery-iteration-${this.iteration}`);
  }

  currentStrategy(): CognitiveStrategy {
    return this.strategy;
  }

  averageScore(): number {
    if (this.scoreHistory.length === 0) return 0;
    return this.scoreHistory.reduce((a, b) => a + b, 0) / this.scoreHistory.length;
  }

  getDecisions(): readonly AdaptiveLoopDecision[] {
    return this.decisions;
  }

  getHealth(): ClusterHealthSnapshot {
    return this.runtime.getClusterHealth();
  }

  reset(): void {
    this.runtime.reset();
    this.iteration = 0;
    this.strategy = 'balanced';
    this.consecutiveFailures = 0;
    this.scoreHistory = [];
    this.decisions = [];
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private computeScore(result: CycleResult, health: ClusterHealthSnapshot): number {
    let score = 0;

    // Outcome contribution (0–50 pts)
    switch (result.outcome) {
      case 'success': score += 50; break;
      case 'degraded': score += 20; break;
      case 'timeout': score += 15; break;
      case 'failure': score += 5; break;
      case 'partition': score += 0; break;
    }

    // Health contribution (0–30 pts)
    score += health.globalTrust * 20;
    score += health.consensusHealth * 10;

    // Penalty for affected nodes and recovery
    score -= result.affectedNodes.length * 2;
    if (result.recoveryTriggered) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private selectStrategy(
    result: CycleResult,
    health: ClusterHealthSnapshot,
    score: number
  ): { strategy: CognitiveStrategy; reason: string } {
    if (health.globalTrust < this.config.healthThresholdCritical || this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return { strategy: 'recovery', reason: `critical trust=${health.globalTrust.toFixed(2)} failures=${this.consecutiveFailures}` };
    }

    if (health.globalTrust < this.config.healthThresholdDegraded || result.outcome === 'degraded') {
      return { strategy: 'conservative', reason: `degraded trust=${health.globalTrust.toFixed(2)}` };
    }

    const recentAvg = this.recentAverageScore(5);
    if (recentAvg >= 75 && health.quarantinedNodeCount === 0) {
      return { strategy: 'aggressive', reason: `high score avg=${recentAvg.toFixed(0)}` };
    }

    return { strategy: 'balanced', reason: `score=${score.toFixed(0)} trust=${health.globalTrust.toFixed(2)}` };
  }

  private recentAverageScore(n: number): number {
    const recent = this.scoreHistory.slice(-n);
    if (recent.length === 0) return 0;
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }
}
