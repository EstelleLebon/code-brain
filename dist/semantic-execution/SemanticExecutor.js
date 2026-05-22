"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticExecutor = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const OperationRegistry_js_1 = require("./OperationRegistry.js");
const ASTTransformer_js_1 = require("../ast-runtime/ASTTransformer.js");
const ValidationPipeline_js_1 = require("../validation/ValidationPipeline.js");
const RiskAssessmentEngine_js_1 = require("../risk/RiskAssessmentEngine.js");
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
const SemanticDiffEngine_js_1 = require("../semantic-diff/SemanticDiffEngine.js");
const SemanticReplayLog_js_1 = require("../semantic-replay/SemanticReplayLog.js");
class SemanticExecutor {
    registry;
    transformer;
    validator;
    riskEngine;
    trustEvaluator;
    diffEngine;
    replayLog;
    constructor(trustPolicy = TrustPolicy_js_1.DEFAULT_TRUST_POLICY) {
        this.registry = new OperationRegistry_js_1.OperationRegistry();
        this.transformer = new ASTTransformer_js_1.ASTTransformer();
        this.validator = new ValidationPipeline_js_1.ValidationPipeline();
        this.riskEngine = new RiskAssessmentEngine_js_1.RiskAssessmentEngine();
        this.trustEvaluator = new TrustPolicy_js_1.TrustEvaluator(trustPolicy);
        this.diffEngine = new SemanticDiffEngine_js_1.SemanticDiffEngine();
        this.replayLog = new SemanticReplayLog_js_1.SemanticReplayLog();
    }
    // ── Planning phase (no file writes) ─────────────────────────────────────────
    plan(transformation, ctx) {
        const steps = [];
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
    execute(transformation, ctx) {
        const start = Date.now();
        // 1. Plan
        const plan = this.plan(transformation, ctx);
        const allMutations = plan.steps.flatMap(s => s.mutations);
        // 2. Apply mutations to in-memory copies
        const transformedFiles = new Map();
        for (const [filePath, source] of ctx.files) {
            transformedFiles.set(filePath, source);
        }
        const transformResults = this.transformer.applyToFiles(transformedFiles, allMutations);
        for (const [filePath, result] of transformResults) {
            transformedFiles.set(filePath, result.source);
        }
        // 3. Validate
        const allAffectedSymbols = transformation.operations.flatMap(op => op.targetSymbols);
        let validation = { valid: true, errors: [], warnings: [], riskScore: 0 };
        for (const [filePath, originalSource] of ctx.files) {
            const transformed = transformedFiles.get(filePath) ?? originalSource;
            if (transformed === originalSource)
                continue;
            const valCtx = {
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
        const semanticDiffs = [];
        for (const step of plan.steps) {
            const affectedPaths = [...new Set(step.mutations.map(m => m.filePath))];
            const operationDiffs = affectedPaths.map(fp => this.diffEngine.computeOperationDiff(fp, ctx.files.get(fp) ?? '', transformedFiles.get(fp) ?? '', step.operation));
            semanticDiffs.push(this.diffEngine.computeSemanticDiff(step.operation, operationDiffs));
        }
        const allOperationDiffs = plan.steps.flatMap(step => {
            const affectedPaths = [...new Set(step.mutations.map(m => m.filePath))];
            return affectedPaths.map(fp => this.diffEngine.computeOperationDiff(fp, ctx.files.get(fp) ?? '', transformedFiles.get(fp) ?? '', step.operation));
        });
        const impactSummary = this.diffEngine.summarizeImpact(allOperationDiffs);
        // 7. Commit to disk (only if not dry-run, approved, and validation passed)
        let success = false;
        let error;
        const shouldCommit = !ctx.dryRun && trust.approved && validation.valid;
        if (shouldCommit) {
            try {
                for (const [filePath, source] of transformedFiles) {
                    const original = ctx.files.get(filePath);
                    if (source !== original) {
                        const absPath = path_1.default.isAbsolute(filePath)
                            ? filePath
                            : path_1.default.join(ctx.workingDirectory, filePath);
                        fs_1.default.writeFileSync(absPath, source, 'utf-8');
                    }
                }
                success = true;
            }
            catch (err) {
                error = err instanceof Error ? err.message : String(err);
            }
        }
        else if (ctx.dryRun) {
            success = true;
        }
        else if (!trust.approved) {
            error = `Blocked by trust policy (${trust.approvalMode}): ${trust.reasons[0]}`;
        }
        else if (!validation.valid) {
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
    getRegistry() {
        return this.registry;
    }
}
exports.SemanticExecutor = SemanticExecutor;
//# sourceMappingURL=SemanticExecutor.js.map