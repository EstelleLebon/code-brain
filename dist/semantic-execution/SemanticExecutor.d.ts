import { SemanticTransformation } from '../semantic-ir/types.js';
import { ExecutionContext } from './ExecutionContext.js';
import { ExecutionPlan } from './ExecutionPlan.js';
import { OperationRegistry } from './OperationRegistry.js';
import { ValidationResult } from '../validation/types.js';
import { RiskAssessment } from '../risk/RiskAssessmentEngine.js';
import { TrustDecision, TrustPolicy } from '../trust/TrustPolicy.js';
import { SemanticDiff, ImpactSummary } from '../semantic-diff/SemanticDiff.js';
import { SemanticReplayLog } from '../semantic-replay/SemanticReplayLog.js';
import type { CognitiveConfig } from './CognitiveConfig.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
import type { LearningResult } from '../learning/RuntimeLearningEngine.js';
import type { RuntimeValidationResult } from '../runtime-validation/types.js';
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
export interface CognitiveLoopData {
    runtimeValidation?: RuntimeValidationResult;
    outcomes: ExecutionOutcome[];
    learningResults: LearningResult[];
    replayEventIds: string[];
}
export interface CognitiveExecutionResult extends ExecutionResult {
    cognitive: CognitiveLoopData;
}
export declare class SemanticExecutor {
    private registry;
    private transformer;
    private validator;
    private riskEngine;
    private trustEvaluator;
    private diffEngine;
    readonly replayLog: SemanticReplayLog;
    private cognitive;
    constructor(trustPolicy?: TrustPolicy, cognitive?: CognitiveConfig);
    plan(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionPlan;
    execute(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionResult;
    executeAsync(transformation: SemanticTransformation, ctx: ExecutionContext, cognitiveOverride?: CognitiveConfig): Promise<CognitiveExecutionResult>;
    getRegistry(): OperationRegistry;
}
//# sourceMappingURL=SemanticExecutor.d.ts.map