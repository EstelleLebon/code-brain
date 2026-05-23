import type { CognitiveExecutionRuntime, ClusterHealthSnapshot, CycleResult } from './CognitiveExecutionRuntime.js';
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
/**
 * High-level adaptive strategy layer for distributed cognitive execution.
 * Responsible for: strategy selection, score computation, adaptation decisions.
 * Does NOT know about: replay, vector clocks, consensus, memory reconciliation.
 * All cluster mechanics are delegated to CognitiveExecutionRuntime.
 */
export declare class AdaptiveCognitiveLoop {
    private readonly runtime;
    private readonly config;
    private iteration;
    private strategy;
    private consecutiveFailures;
    private scoreHistory;
    private decisions;
    constructor(runtime: CognitiveExecutionRuntime, config?: Partial<AdaptiveLoopConfig>);
    /** Run one complete adaptive cycle against the given node list. */
    runCycle(nodeIds: string[]): AdaptiveLoopDecision;
    /** Recover a specific node without running a full cycle. */
    recoverNode(nodeId: string): boolean;
    currentStrategy(): CognitiveStrategy;
    averageScore(): number;
    getDecisions(): readonly AdaptiveLoopDecision[];
    getHealth(): ClusterHealthSnapshot;
    reset(): void;
    private computeScore;
    private selectStrategy;
    private recentAverageScore;
}
//# sourceMappingURL=AdaptiveCognitiveLoop.d.ts.map