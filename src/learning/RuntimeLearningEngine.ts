import { FailureLearning, type FailureLearningResult } from './FailureLearning.js';
import { SuccessPatternMemory } from './SuccessPatternMemory.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
import type { FailureMemoryStore } from '../persistence/failure-memory/FailureMemoryStore.js';
import type { CalibrationStore } from '../persistence/calibration/CalibrationStore.js';
import type { RiskCalibration } from '../calibration/RiskCalibration.js';

export interface LearningResult {
  outcome: 'success' | 'failure_learned';
  failureLearning?: FailureLearningResult;
  successPatternId?: string;
}

/**
 * Top-level learning orchestrator: routes execution outcomes to the appropriate
 * learning subsystem (failure or success), persists what can be persisted.
 */
export class RuntimeLearningEngine {
  private failureLearning: FailureLearning;
  readonly successMemory: SuccessPatternMemory;
  readonly failureMemory: FailureMemory;

  constructor(
    private readonly calibration: RiskCalibration | null = null,
    failureStore: FailureMemoryStore | null = null,
    readonly calibrationStore: CalibrationStore | null = null,
  ) {
    this.failureMemory = new FailureMemory();
    this.successMemory = new SuccessPatternMemory();
    this.failureLearning = new FailureLearning(this.failureMemory, failureStore, calibration);
  }

  observe(outcome: ExecutionOutcome): LearningResult {
    if (outcome.outcome === 'success') {
      const context = outcome.signals.map(s => s.signalType);
      const pattern = this.successMemory.record(
        outcome.signals[0]?.source ?? 'unknown',
        context,
        outcome.riskObserved,
      );

      // Persist calibration record on success too
      if (this.calibration && this.calibrationStore) {
        const cal = this.calibration.observe(
          outcome.signals[0]?.source ?? 'unknown',
          outcome.riskObserved,
          outcome.riskObserved,
        );
        this.calibrationStore.save({
          id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          operationType: outcome.signals[0]?.source ?? 'unknown',
          predictedRisk: outcome.riskObserved,
          observedRisk: outcome.riskObserved,
          calibrationDelta: cal.calibrationDelta,
          timestamp: Date.now(),
        });
      }

      return { outcome: 'success', successPatternId: pattern.id };
    }

    const fl = this.failureLearning.learn(outcome);
    return { outcome: 'failure_learned', failureLearning: fl };
  }
}
