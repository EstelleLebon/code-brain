import fs from 'fs';
import path from 'path';

import { SemanticTransformation } from '../semantic-ir/types.js';
import { ExecutionContext } from './ExecutionContext.js';
import { ExecutionPlan, ExecutionStep } from './ExecutionPlan.js';
import { OperationRegistry } from './OperationRegistry.js';
import { ASTTransformer } from '../ast-runtime/ASTTransformer.js';
import { ValidationPipeline } from '../validation/ValidationPipeline.js';
import { ValidationContext, ValidationResult } from '../validation/types.js';
import { RiskAssessmentEngine, RiskAssessment } from '../risk/RiskAssessmentEngine.js';
import { TrustEvaluator, TrustDecision, TrustPolicy, DEFAULT_TRUST_POLICY } from '../trust/TrustPolicy.js';
import { SemanticDiffEngine } from '../semantic-diff/SemanticDiffEngine.js';
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

export class SemanticExecutor {
  private registry: OperationRegistry;
  private transformer: ASTTransformer;
  private validator: ValidationPipeline;
  private riskEngine: RiskAssessmentEngine;
  private trustEvaluator: TrustEvaluator;
  private diffEngine: SemanticDiffEngine;
  readonly replayLog: SemanticReplayLog;
  private cognitive: CognitiveConfig;

  constructor(trustPolicy: TrustPolicy = DEFAULT_TRUST_POLICY, cognitive: CognitiveConfig = {}) {
    this.registry = new OperationRegistry();
    this.transformer = new ASTTransformer();
    this.validator = new ValidationPipeline();
    this.riskEngine = new RiskAssessmentEngine();
    this.trustEvaluator = new TrustEvaluator(trustPolicy);
    this.diffEngine = new SemanticDiffEngine();
    this.replayLog = new SemanticReplayLog();
    this.cognitive = cognitive;
  }

  // ── Planning phase (no file writes) ─────────────────────────────────────────

  plan(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionPlan {
    const steps: ExecutionStep[] = [];

    for (const operation of transformation.operations) {
      const handler = this.registry.get(operation.operationType);
      if (!handler) {
        steps.push({ operationId: operation.id, operation, mutations: [], estimatedFilesAffected: 0 });
        continue;
      }

      // Collect mutations across all files in context
      const allMutations = [];
      for (const [filePath, source] of ctx.files) {
        const engineCtx = { filePath, source, allFiles: ctx.files };
        const mutations = handler(operation, engineCtx);
        allMutations.push(...mutations);
      }

      const affectedFiles = new Set(allMutations.map(m => m.filePath)).size;
      steps.push({ operationId: operation.id, operation, mutations: allMutations, estimatedFilesAffected: affectedFiles });
    }

    const totalMutations = steps.reduce((sum, s) => sum + s.mutations.length, 0);
    const affectedFilesSet = new Set(steps.flatMap(s => s.mutations.map(m => m.filePath)));

    return {
      transformationId: transformation.id,
      steps,
      totalMutations,
      estimatedFilesAffected: affectedFilesSet.size,
      createdAt: Date.now(),
    };
  }

  // ── Execution pipeline ───────────────────────────────────────────────────────

  execute(transformation: SemanticTransformation, ctx: ExecutionContext): ExecutionResult {
    const start = Date.now();

    // 1. Plan
    const plan = this.plan(transformation, ctx);
    const allMutations = plan.steps.flatMap(s => s.mutations);

    // 2. Apply mutations to in-memory copies
    const transformedFiles = new Map<string, string>();
    for (const [filePath, source] of ctx.files) {
      transformedFiles.set(filePath, source);
    }
    const transformResults = this.transformer.applyToFiles(transformedFiles, allMutations);
    for (const [filePath, result] of transformResults) {
      transformedFiles.set(filePath, result.source);
    }

    // 3. Validate
    const allAffectedSymbols = transformation.operations.flatMap(op => op.targetSymbols);
    let validation: ValidationResult = { valid: true, errors: [], warnings: [], riskScore: 0 };

    for (const [filePath, originalSource] of ctx.files) {
      const transformed = transformedFiles.get(filePath) ?? originalSource;
      if (transformed === originalSource) continue;

      const valCtx: ValidationContext = {
        filePath,
        source: originalSource,
        transformedSource: transformed,
        affectedSymbols: allAffectedSymbols,
        allFiles: ctx.files,
        allTransformedFiles: transformedFiles,
      };
      const result = this.validator.run(valCtx);
      validation = {
        valid: validation.valid && result.valid,
        errors: [...validation.errors, ...result.errors],
        warnings: [...validation.warnings, ...result.warnings],
        riskScore: Math.min(100, validation.riskScore + result.riskScore),
      };
    }

    // 4. Risk assessment
    const risk = this.riskEngine.assessMany(transformation.operations);

    // 5. Trust decision
    const trust = this.trustEvaluator.evaluate(risk.level, risk.reasons);

    // 6. Semantic diffs
    const semanticDiffs: SemanticDiff[] = [];
    for (const step of plan.steps) {
      const affectedPaths = [...new Set(step.mutations.map(m => m.filePath))];
      const operationDiffs = affectedPaths.map(fp =>
        this.diffEngine.computeOperationDiff(
          fp,
          ctx.files.get(fp) ?? '',
          transformedFiles.get(fp) ?? '',
          step.operation
        )
      );
      semanticDiffs.push(this.diffEngine.computeSemanticDiff(step.operation, operationDiffs));
    }
    const allOperationDiffs = plan.steps.flatMap(step => {
      const affectedPaths = [...new Set(step.mutations.map(m => m.filePath))];
      return affectedPaths.map(fp =>
        this.diffEngine.computeOperationDiff(fp, ctx.files.get(fp) ?? '', transformedFiles.get(fp) ?? '', step.operation)
      );
    });
    const impactSummary = this.diffEngine.summarizeImpact(allOperationDiffs);

    // 7. Commit to disk (only if not dry-run, approved, and validation passed)
    let success = false;
    let error: string | undefined;

    const shouldCommit = !ctx.dryRun && trust.approved && validation.valid;

    if (shouldCommit) {
      try {
        for (const [filePath, source] of transformedFiles) {
          const original = ctx.files.get(filePath);
          if (source !== original) {
            const absPath = path.isAbsolute(filePath)
              ? filePath
              : path.join(ctx.workingDirectory, filePath);
            fs.writeFileSync(absPath, source, 'utf-8');
          }
        }
        success = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    } else if (ctx.dryRun) {
      success = true;
    } else if (!trust.approved) {
      error = `Blocked by trust policy (${trust.approvalMode}): ${trust.reasons[0]}`;
    } else if (!validation.valid) {
      error = `Validation failed: ${validation.errors[0]}`;
    }

    // 8. Record replay events
    for (const step of plan.steps) {
      const affectedArtifacts = [...new Set(step.mutations.map(m => m.filePath))];
      this.replayLog.record({
        operationId: step.operationId,
        operationType: step.operation.operationType,
        transformationId: transformation.id,
        affectedArtifacts,
        status: success ? 'applied' : (error ? 'failed' : 'planned'),
        durationMs: Date.now() - start,
        error,
      });
    }

    return {
      transformationId: transformation.id,
      success,
      dryRun: ctx.dryRun,
      plan,
      validation,
      risk,
      trust,
      semanticDiffs,
      impactSummary,
      transformedFiles,
      error,
      durationMs: Date.now() - start,
    };
  }

  // ── Cognitive pipeline (async) ────────────────────────────────────────────────
  // Wraps execute() and closes the learning loop:
  //   execute → runtime validation → outcome analysis → learning → replay record

  async executeAsync(
    transformation: SemanticTransformation,
    ctx: ExecutionContext,
    cognitiveOverride?: CognitiveConfig,
  ): Promise<CognitiveExecutionResult> {
    const cfg = cognitiveOverride ?? this.cognitive;

    // 1. Run the synchronous execution pipeline
    const base = this.execute(transformation, ctx);

    const cognitiveData: CognitiveLoopData = {
      outcomes: [],
      learningResults: [],
      replayEventIds: [],
    };

    // 2. Runtime validation (async — runs tests/lint/typecheck if configured)
    let runtimeSignals: import('../runtime-awareness/RuntimeSignal.js').RuntimeSignal[] = [];
    if (cfg.validationPipeline) {
      cognitiveData.runtimeValidation = await cfg.validationPipeline.run(ctx.workingDirectory);
      runtimeSignals = cognitiveData.runtimeValidation.signals;
    }

    // 3. Outcome analysis — one outcome per operation step
    if (cfg.outcomeAnalyzer) {
      for (const step of base.plan.steps) {
        const outcome = cfg.outcomeAnalyzer.analyze(
          step.operationId,
          step.operation.operationType,
          runtimeSignals,
        );
        cognitiveData.outcomes.push(outcome);

        // 4. Learning — route outcome to RuntimeLearningEngine
        if (cfg.learningEngine) {
          // Map execution success/failure into outcome status for learning
          const learningOutcome = base.success
            ? outcome
            : { ...outcome, outcome: 'failure' as const };
          const lr = cfg.learningEngine.observe(learningOutcome);
          cognitiveData.learningResults.push(lr);
        }

            // 5. Runtime replay record
        if (cfg.runtimeReplayLog) {
          const signalTypes = runtimeSignals.map(s => s.signalType);
          const event = cfg.runtimeReplayLog.record(
            step.operationId,
            signalTypes,
            outcome.id,
            !base.success,
            { transformationId: transformation.id, durationMs: base.durationMs },
          );
          cognitiveData.replayEventIds.push(event.id);
        }

        // 6. Feed result into CognitiveFeedbackLoop (v3.5)
        if (cfg.feedbackLoop && cognitiveData.learningResults.length > 0) {
          const lr = cognitiveData.learningResults[cognitiveData.learningResults.length - 1];
          const affectedChunkIds: string[] = [];
          try {
            cfg.feedbackLoop.observe(lr, outcome, affectedChunkIds);
          } catch {
            // feedback loop errors must never break execution
          }
        }
      }
    }

    // 7. Self-healing on failure (v3.5)
    if (!base.success && cfg.selfHealingEngine) {
      try {
        cfg.selfHealingEngine.heal(base, runtimeSignals);
      } catch {
        // self-healing errors are isolated
      }
    }

    // 8. Record metrics (v3.5)
    if (cfg.metricsAggregator) {
      try {
        cfg.metricsAggregator.recordExecution({
          success: base.success,
          hadRollback: false,
          retrievalHits: 0,
          retrievalTotal: 0,
          hadContradiction: false,
          runtimePassed: cognitiveData.runtimeValidation
            ? cognitiveData.runtimeValidation.passed
            : base.success,
          calibrationDelta: 0,
          signals: runtimeSignals,
        });
      } catch {
        // metrics errors are isolated
      }
    }

    return { ...base, cognitive: cognitiveData };
  }

  getRegistry(): OperationRegistry {
    return this.registry;
  }
}
