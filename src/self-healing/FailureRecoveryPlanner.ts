import { RollbackHeuristics, type RollbackDecision } from './RollbackHeuristics.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { FailurePattern } from '../failure-memory/FailurePattern.js';

export type RecoveryStrategy = 'rollback' | 'retry' | 'reduce_scope' | 'switch_mode';

export interface RecoveryPlan {
  strategy: RecoveryStrategy;
  confidence: number;
  reason: string;
  rollback?: RollbackDecision;
  retryMaxMutations?: number;
  suggestedMode?: string;
}

export class FailureRecoveryPlanner {
  private heuristics = new RollbackHeuristics();

  plan(
    signals: RuntimeSignal[],
    affectedArtifacts: string[],
    knownPatterns: FailurePattern[],
    failureSeverity: number,
  ): RecoveryPlan {
    // If we've seen this pattern before with high frequency → switch mode
    const knownHighFreq = knownPatterns.find(p => p.frequency >= 3 && p.severity >= 60);
    if (knownHighFreq) {
      return {
        strategy: 'switch_mode',
        confidence: 0.85,
        reason: `Repeated failure pattern '${knownHighFreq.operationType}' (freq=${knownHighFreq.frequency}) — switching cognitive mode to RECOVERY`,
        suggestedMode: 'RECOVERY',
      };
    }

    // High severity → rollback
    if (failureSeverity >= 70) {
      const rollback = this.heuristics.decide(signals, affectedArtifacts, failureSeverity);
      return {
        strategy: 'rollback',
        confidence: rollback.confidence,
        reason: rollback.reason,
        rollback,
      };
    }

    // Medium severity with few mutations → retry with reduced scope
    if (failureSeverity >= 40 && affectedArtifacts.length > 1) {
      return {
        strategy: 'reduce_scope',
        confidence: 0.65,
        reason: `Medium severity (${failureSeverity}) — reducing mutation scope to first affected artifact`,
        retryMaxMutations: 1,
      };
    }

    // Low severity → retry
    return {
      strategy: 'retry',
      confidence: 0.55,
      reason: `Low severity failure (${failureSeverity}) — retry may succeed`,
    };
  }
}
