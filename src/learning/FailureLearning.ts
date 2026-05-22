import { FailureMemory } from '../failure-memory/FailureMemory.js';
import type { FailureMemoryStore } from '../persistence/failure-memory/FailureMemoryStore.js';
import type { RiskCalibration } from '../calibration/RiskCalibration.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';

export interface FailureLearningResult {
  patternRecorded: boolean;
  patternId: string | null;
  calibrationAdjusted: boolean;
}

/**
 * On each runtime failure, enriches FailureMemory, persists it,
 * and triggers risk recalibration.
 */
export class FailureLearning {
  constructor(
    private readonly memory: FailureMemory,
    private readonly store: FailureMemoryStore | null,
    private readonly calibration: RiskCalibration | null,
  ) {}

  learn(outcome: ExecutionOutcome): FailureLearningResult {
    if (outcome.outcome === 'success' || outcome.outcome === 'partial_success') {
      return { patternRecorded: false, patternId: null, calibrationAdjusted: false };
    }

    const structuralContext = outcome.signals.map(s => s.signalType);
    const runtimeConsequences = outcome.signals
      .filter(s => s.status === 'failure')
      .map(s => `${s.signalType}:${s.source}`);
    const severity = outcome.riskObserved / 100;

    const pattern = this.memory.record(
      outcome.signals[0]?.source ?? 'unknown',
      structuralContext,
      runtimeConsequences,
      severity,
    );

    // Persist if store available
    if (this.store) {
      this.store.save(pattern);
    }

    // Recalibrate risk
    let calibrationAdjusted = false;
    if (this.calibration && outcome.riskObserved > 0) {
      this.calibration.observe(
        outcome.signals[0]?.source ?? 'unknown',
        outcome.riskObserved,
        outcome.riskObserved,
      );
      calibrationAdjusted = true;
    }

    return { patternRecorded: true, patternId: pattern.id, calibrationAdjusted };
  }
}
