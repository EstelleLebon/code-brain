import { FailureRecoveryPlanner, type RecoveryPlan } from './FailureRecoveryPlanner.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { FailureMemory } from '../failure-memory/FailureMemory.js';
import type { ExecutionResult } from '../semantic-execution/SemanticExecutor.js';

export interface HealingAttempt {
  executionId: string;
  plan: RecoveryPlan;
  timestamp: number;
  resolved: boolean;
}

export class SelfHealingEngine {
  private planner = new FailureRecoveryPlanner();
  private history: HealingAttempt[] = [];

  constructor(private readonly failureMemory?: FailureMemory) {}

  /**
   * Analyse a failed execution result and produce a recovery plan.
   * Never throws — healing failures are isolated from the main loop.
   */
  heal(
    result: ExecutionResult,
    signals: RuntimeSignal[],
    failureSeverity = 50,
  ): RecoveryPlan {
    try {
      const affectedArtifacts = result.plan.steps.flatMap(s =>
        s.mutations.map(m => m.filePath)
      );

      const knownPatterns = this.failureMemory
        ? this.failureMemory.search(undefined, undefined)
        : [];

      const plan = this.planner.plan(signals, affectedArtifacts, knownPatterns, failureSeverity);

      this.history.push({
        executionId: result.transformationId,
        plan,
        timestamp: Date.now(),
        resolved: false,
      });

      return plan;
    } catch {
      return {
        strategy: 'retry',
        confidence: 0.1,
        reason: 'SelfHealingEngine internal error — defaulting to retry',
      };
    }
  }

  markResolved(executionId: string): void {
    const attempt = this.history.find(h => h.executionId === executionId);
    if (attempt) attempt.resolved = true;
  }

  getHistory(): HealingAttempt[] {
    return [...this.history];
  }

  unresolvedCount(): number {
    return this.history.filter(h => !h.resolved).length;
  }
}
