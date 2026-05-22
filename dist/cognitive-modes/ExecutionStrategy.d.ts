import { CognitiveMode } from './CognitiveMode.js';
import type { RiskLevel } from '../risk/RiskAssessmentEngine.js';
export interface ExecutionStrategy {
    mode: CognitiveMode;
    maxMutations: number;
    validationDepth: 'none' | 'basic' | 'full';
    requiresRuntimePipeline: boolean;
    autoApproveMaxRisk: RiskLevel;
    rollbackAggressiveness: 'lazy' | 'eager' | 'immediate';
    retrievalStrictness: 'relaxed' | 'normal' | 'strict';
}
export declare const STRATEGIES: Record<CognitiveMode, ExecutionStrategy>;
export declare function getStrategy(mode: CognitiveMode): ExecutionStrategy;
//# sourceMappingURL=ExecutionStrategy.d.ts.map