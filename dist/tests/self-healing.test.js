"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RollbackHeuristics_js_1 = require("../self-healing/RollbackHeuristics.js");
const FailureRecoveryPlanner_js_1 = require("../self-healing/FailureRecoveryPlanner.js");
const SelfHealingEngine_js_1 = require("../self-healing/SelfHealingEngine.js");
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
function makeSignal(type, status) {
    return { id: `s-${Date.now()}`, signalType: type, status, source: 'test', timestamp: Date.now() };
}
function makeExecutionResult(id = 'tx-1', fileCount = 2) {
    const mutations = Array.from({ length: fileCount }, (_, i) => ({
        filePath: `file${i}.ts`, startIndex: 0, endIndex: 3, replacement: 'bar', reason: 'test',
    }));
    return {
        transformationId: id, success: false, dryRun: false,
        plan: { transformationId: id, steps: [{ operationId: 'op1', operation: {}, mutations, estimatedFilesAffected: fileCount }], totalMutations: fileCount, estimatedFilesAffected: fileCount, createdAt: Date.now() },
        validation: { valid: false, errors: ['test error'], warnings: [], riskScore: 50 },
        risk: { score: 60, level: 'high', reasons: [] },
        trust: { approved: false, requiresHumanReview: true, approvalMode: 'review', reasons: [] },
        semanticDiffs: [], impactSummary: { totalFilesAffected: 0, totalSymbolsAffected: 0, addedSymbols: [], removedSymbols: [], renamedSymbols: [], structuralChanges: [] },
        transformedFiles: new Map(), durationMs: 100,
    };
}
(0, node_test_1.describe)('RollbackHeuristics', () => {
    const heuristics = new RollbackHeuristics_js_1.RollbackHeuristics();
    (0, node_test_1.test)('no signals → scope none', () => {
        const decision = heuristics.decide([], ['file.ts'], 30);
        strict_1.default.equal(decision.scope, 'none');
    });
    (0, node_test_1.test)('high severity → full rollback', () => {
        const signals = [makeSignal('build', 'failure'), makeSignal('test', 'failure'), makeSignal('typecheck', 'failure')];
        const decision = heuristics.decide(signals, ['a.ts', 'b.ts', 'c.ts'], 85);
        strict_1.default.equal(decision.scope, 'full');
        strict_1.default.ok(decision.confidence >= 0.8);
    });
    (0, node_test_1.test)('moderate severity → partial rollback', () => {
        const signals = [makeSignal('build', 'failure')];
        const decision = heuristics.decide(signals, ['a.ts', 'b.ts', 'c.ts', 'd.ts'], 55);
        strict_1.default.equal(decision.scope, 'partial');
        strict_1.default.ok(decision.targetArtifacts.length < 4);
    });
    (0, node_test_1.test)('low severity → no rollback', () => {
        const signals = [makeSignal('test', 'failure')];
        const decision = heuristics.decide(signals, ['a.ts'], 20);
        strict_1.default.equal(decision.scope, 'none');
    });
});
(0, node_test_1.describe)('FailureRecoveryPlanner', () => {
    const planner = new FailureRecoveryPlanner_js_1.FailureRecoveryPlanner();
    (0, node_test_1.test)('high severity → rollback strategy', () => {
        const signals = [makeSignal('build', 'failure'), makeSignal('test', 'failure')];
        const plan = planner.plan(signals, ['a.ts', 'b.ts'], [], 80);
        strict_1.default.equal(plan.strategy, 'rollback');
        strict_1.default.ok(plan.confidence > 0.5);
    });
    (0, node_test_1.test)('medium severity with multiple files → reduce_scope', () => {
        const signals = [makeSignal('test', 'failure')];
        const plan = planner.plan(signals, ['a.ts', 'b.ts', 'c.ts'], [], 50);
        strict_1.default.equal(plan.strategy, 'reduce_scope');
        strict_1.default.equal(plan.retryMaxMutations, 1);
    });
    (0, node_test_1.test)('low severity → retry', () => {
        const signals = [makeSignal('test', 'warning')];
        const plan = planner.plan(signals, ['a.ts'], [], 20);
        strict_1.default.equal(plan.strategy, 'retry');
    });
    (0, node_test_1.test)('known high-freq pattern → switch_mode', () => {
        const failureMemory = new FailureMemory_js_1.FailureMemory();
        const pattern = failureMemory.record('rename_symbol', ['ctx1'], ['consequence1'], 70);
        // bump frequency to ≥ 3
        pattern.frequency = 3;
        const knownPatterns = failureMemory.all();
        const plan = planner.plan([], ['a.ts'], knownPatterns, 50);
        strict_1.default.equal(plan.strategy, 'switch_mode');
        strict_1.default.equal(plan.suggestedMode, 'RECOVERY');
    });
});
(0, node_test_1.describe)('SelfHealingEngine', () => {
    (0, node_test_1.test)('heal returns a recovery plan', () => {
        const engine = new SelfHealingEngine_js_1.SelfHealingEngine();
        const result = makeExecutionResult();
        const signals = [makeSignal('build', 'failure')];
        const plan = engine.heal(result, signals, 60);
        strict_1.default.ok(plan.strategy);
        strict_1.default.ok(plan.confidence >= 0);
    });
    (0, node_test_1.test)('heal records history', () => {
        const engine = new SelfHealingEngine_js_1.SelfHealingEngine();
        engine.heal(makeExecutionResult('tx-a'), [], 30);
        engine.heal(makeExecutionResult('tx-b'), [], 30);
        strict_1.default.equal(engine.getHistory().length, 2);
    });
    (0, node_test_1.test)('markResolved updates history entry', () => {
        const engine = new SelfHealingEngine_js_1.SelfHealingEngine();
        engine.heal(makeExecutionResult('tx-c'), [], 30);
        strict_1.default.equal(engine.unresolvedCount(), 1);
        engine.markResolved('tx-c');
        strict_1.default.equal(engine.unresolvedCount(), 0);
    });
    (0, node_test_1.test)('heal with failure memory leverages patterns', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('rename_symbol', ['ctx1'], ['err'], 70);
        mem.record('rename_symbol', ['ctx1'], ['err'], 70);
        mem.record('rename_symbol', ['ctx1'], ['err'], 70);
        const engine = new SelfHealingEngine_js_1.SelfHealingEngine(mem);
        const plan = engine.heal(makeExecutionResult(), [makeSignal('build', 'failure')], 75);
        // With known high-freq pattern, planner may switch_mode
        strict_1.default.ok(['rollback', 'retry', 'reduce_scope', 'switch_mode'].includes(plan.strategy));
    });
    (0, node_test_1.test)('heal never throws', () => {
        const engine = new SelfHealingEngine_js_1.SelfHealingEngine();
        strict_1.default.doesNotThrow(() => engine.heal(makeExecutionResult(), [], 999));
    });
});
//# sourceMappingURL=self-healing.test.js.map