import { SemanticTransformation } from '../semantic-ir/types.js';
import { ExecutionContext } from './ExecutionContext.js';
import { ExecutionPlan } from './ExecutionPlan.js';
import { OperationRegistry } from './OperationRegistry.js';
import { ValidationResult } from '../validation/types.js';
import { RiskAssessment } from '../risk/RiskAssessmentEngine.js';
import { TrustDecision, TrustPolicy } from '../trust/TrustPolicy.js';
import { SemanticDiff, ImpactSummary } from '../semantic-diff/SemanticDiff.js';
import { SemanticReplayLog } from '../semantic-replay/SemanticReplayLog.js';
export interface ExecutionResult {
    transformationId: string;
    success: boolean;
    dryRun: boolean;
    plan: ExecutionPlan;
    validation: ValidationResult;
    risk: RiskAssessment;
    trust: TrustDecision;
    semanticDiffs: SemanticDiff[];
    impactSummary: ImpactSummary;
    transformedFiles: Map<string, string>;
    error?: string;
    durationMs: number;
}
export declare class SemanticExecutor {
    private registry;
    private transformer;
    private validator;
    private riskEngine;
    private trustEvaluator;
    private diffEngine;
    readonly replayLog: SemanticReplayLog;
    constructor(trustPolicy?: TrustPolicy);
    plan(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionPlan;
    execute(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionResult;
    getRegistry(): OperationRegistry;
}
//# sourceMappingURL=SemanticExecutor.d.ts.map