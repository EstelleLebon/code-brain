import { CognitiveMode } from './CognitiveMode.js';
import { type ExecutionStrategy } from './ExecutionStrategy.js';
import type { AggregatedLearningSignal } from '../cognitive-loop/LearningSignalAggregator.js';
import type { RiskLevel } from '../risk/RiskAssessmentEngine.js';
export interface ModeSelectorContext {
    calibratedRisk: RiskLevel;
    recentFailures: number;
    recentSuccesses: number;
    runtimeInstability: boolean;
    retrievalConfidence: number;
    isHotfix: boolean;
    learningSignal?: AggregatedLearningSignal;
}
export declare class ModeSelector {
    select(ctx: ModeSelectorContext): CognitiveMode;
    selectWithStrategy(ctx: ModeSelectorContext): {
        mode: CognitiveMode;
        strategy: ExecutionStrategy;
    };
}
//# sourceMappingURL=ModeSelector.d.ts.map