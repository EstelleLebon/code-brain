import { SemanticOperation } from '../semantic-ir/types.js';
import { RiskAssessment, RiskLevel } from './RiskAssessmentEngine.js';
import { RiskCalibration } from '../calibration/RiskCalibration.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';
export interface RuntimeRiskContext {
    affectedFileCount?: number;
    dependencyDepth?: number;
    referencingSymbolCount?: number;
    structuralContext?: string[];
    runtimeInstabilityScore?: number;
}
export interface RuntimeAwareRiskAssessment extends RiskAssessment {
    calibratedScore: number;
    calibratedLevel: RiskLevel;
    failurePatternMatch: boolean;
    failurePatternIds: string[];
}
export declare class RuntimeAwareRiskAssessor {
    private base;
    readonly calibration: RiskCalibration;
    readonly failureMemory: FailureMemory;
    constructor(failureMemory?: FailureMemory);
    assess(operation: SemanticOperation, context?: RuntimeRiskContext): RuntimeAwareRiskAssessment;
}
//# sourceMappingURL=RuntimeAwareRiskAssessor.d.ts.map