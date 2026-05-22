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
export declare class FailureLearning {
    private readonly memory;
    private readonly store;
    private readonly calibration;
    constructor(memory: FailureMemory, store: FailureMemoryStore | null, calibration: RiskCalibration | null);
    learn(outcome: ExecutionOutcome): FailureLearningResult;
}
//# sourceMappingURL=FailureLearning.d.ts.map