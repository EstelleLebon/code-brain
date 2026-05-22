import { SemanticOperation } from '../semantic-ir/types.js';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export interface RiskAssessment {
    score: number;
    level: RiskLevel;
    reasons: string[];
}
export declare function scoreToLevel(score: number): RiskLevel;
export declare class RiskAssessmentEngine {
    assess(operation: SemanticOperation, context?: {
        affectedFileCount?: number;
        dependencyDepth?: number;
        referencingSymbolCount?: number;
    }): RiskAssessment;
    assessMany(operations: SemanticOperation[]): RiskAssessment;
}
//# sourceMappingURL=RiskAssessmentEngine.d.ts.map