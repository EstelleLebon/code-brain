"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveCognitiveLoop = void 0;
const DEFAULT_CONFIG = {
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
class AdaptiveCognitiveLoop {
    runtime;
    config;
    iteration = 0;
    strategy = 'balanced';
    consecutiveFailures = 0;
    scoreHistory = [];
    decisions = [];
    constructor(runtime, config = {}) {
        this.runtime = runtime;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /** Run one complete adaptive cycle against the given node list. */
    runCycle(nodeIds) {
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
        }
        else {
            this.consecutiveFailures = 0;
        }
        const decision = {
            iteration: this.iteration,
            strategy,
            score,
            cycleResult,
            health,
            adaptationReason: reason,
        };
        this.decisions.push(decision);
        return decision;
    }
    /** Recover a specific node without running a full cycle. */
    recoverNode(nodeId) {
        return this.runtime.recoverNode(nodeId, `manual-recovery-iteration-${this.iteration}`);
    }
    currentStrategy() {
        return this.strategy;
    }
    averageScore() {
        if (this.scoreHistory.length === 0)
            return 0;
        return this.scoreHistory.reduce((a, b) => a + b, 0) / this.scoreHistory.length;
    }
    getDecisions() {
        return this.decisions;
    }
    getHealth() {
        return this.runtime.getClusterHealth();
    }
    reset() {
        this.runtime.reset();
        this.iteration = 0;
        this.strategy = 'balanced';
        this.consecutiveFailures = 0;
        this.scoreHistory = [];
        this.decisions = [];
    }
    // ── Private ──────────────────────────────────────────────────────────────────
    computeScore(result, health) {
        let score = 0;
        // Outcome contribution (0–50 pts)
        switch (result.outcome) {
            case 'success':
                score += 50;
                break;
            case 'degraded':
                score += 20;
                break;
            case 'timeout':
                score += 15;
                break;
            case 'failure':
                score += 5;
                break;
            case 'partition':
                score += 0;
                break;
        }
        // Health contribution (0–30 pts)
        score += health.globalTrust * 20;
        score += health.consensusHealth * 10;
        // Penalty for affected nodes and recovery
        score -= result.affectedNodes.length * 2;
        if (result.recoveryTriggered)
            score -= 5;
        return Math.max(0, Math.min(100, score));
    }
    selectStrategy(result, health, score) {
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
    recentAverageScore(n) {
        const recent = this.scoreHistory.slice(-n);
        if (recent.length === 0)
            return 0;
        return recent.reduce((a, b) => a + b, 0) / recent.length;
    }
}
exports.AdaptiveCognitiveLoop = AdaptiveCognitiveLoop;
//# sourceMappingURL=AdaptiveCognitiveLoop.js.map