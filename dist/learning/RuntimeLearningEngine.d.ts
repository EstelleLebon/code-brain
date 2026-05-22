import { type FailureLearningResult } from './FailureLearning.js';
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
export declare class RuntimeLearningEngine {
    private readonly calibration;
    readonly calibrationStore: CalibrationStore | null;
    private failureLearning;
    readonly successMemory: SuccessPatternMemory;
    readonly failureMemory: FailureMemory;
    constructor(calibration?: RiskCalibration | null, failureStore?: FailureMemoryStore | null, calibrationStore?: CalibrationStore | null);
    observe(outcome: ExecutionOutcome): LearningResult;
}
//# sourceMappingURL=RuntimeLearningEngine.d.ts.map