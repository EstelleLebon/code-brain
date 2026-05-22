"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SemanticExecutor_js_1 = require("../semantic-execution/SemanticExecutor.js");
const ExecutionContext_js_1 = require("../semantic-execution/ExecutionContext.js");
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
const OutcomeAnalyzer_js_1 = require("../outcomes/OutcomeAnalyzer.js");
const RuntimeSignalCollector_js_1 = require("../runtime-awareness/RuntimeSignalCollector.js");
const RuntimeAwareRiskAssessor_js_1 = require("../risk/RuntimeAwareRiskAssessor.js");
const RuntimeReplayLog_js_1 = require("../runtime-replay/RuntimeReplayLog.js");
const RiskCalibration_js_1 = require("../calibration/RiskCalibration.js");
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
const ir = new SemanticIR_js_1.SemanticIR();
(0, node_test_1.describe)('SemanticExecutor ↔ OutcomeAnalyzer integration', () => {
    (0, node_test_1.it)('successful execution → success outcome', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const op = ir.createOperation('rename_symbol', ['OldName']);
        op.payload = { newName: 'NewName' };
        const transformation = ir.planTransformation([op]);
        const files = new Map([['a.ts', 'export class OldName {}']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const execResult = executor.execute(transformation, ctx);
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'test' });
        const signals = [
            col.collect('test', execResult.success ? 'success' : 'failure'),
            col.collect('build', 'success'),
        ];
        const analyzer = new OutcomeAnalyzer_js_1.OutcomeAnalyzer();
        const outcome = analyzer.analyze(transformation.id, 'rename_symbol', signals);
        strict_1.default.equal(outcome.outcome, 'success');
        strict_1.default.equal(outcome.riskObserved, 0);
    });
    (0, node_test_1.it)('failed signals → regression outcome, recorded in RuntimeReplayLog', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'ci' });
        const signals = [col.collect('test', 'failure'), col.collect('build', 'success')];
        const analyzer = new OutcomeAnalyzer_js_1.OutcomeAnalyzer();
        const outcome = analyzer.analyze('op-broken', 'move_function', signals);
        strict_1.default.equal(outcome.outcome, 'regression');
        const replayLog = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        const event = replayLog.record('op-broken', signals.map(s => s.id), outcome.id, true);
        strict_1.default.equal(event.causedRollback, true);
        strict_1.default.equal(replayLog.rollbacks().length, 1);
    });
});
(0, node_test_1.describe)('RuntimeAwareRiskAssessor ↔ RiskCalibration feedback loop', () => {
    (0, node_test_1.it)('calibration from observed outcome adjusts future predictions', () => {
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor();
        const op = ir.createOperation('move_function', ['doThing']);
        const initial = assessor.assess(op);
        const initialCalibrated = initial.calibratedScore;
        // Simulate: we saw a much higher risk than predicted
        assessor.calibration.observe('move_function', initial.score, initial.score + 40);
        const after = assessor.assess(op);
        strict_1.default.ok(after.calibratedScore > initialCalibrated, 'calibrated score should increase after bad observation');
    });
    (0, node_test_1.it)('failure memory boosts risk for subsequent same-pattern operations', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor(mem);
        const op = ir.createOperation('split_module', ['UserModule']);
        const baseline = assessor.assess(op, { structuralContext: ['circular-deps'] });
        strict_1.default.equal(baseline.failurePatternMatch, false);
        mem.record('split_module', ['circular-deps'], ['5 tests failed', 'circular import'], 9);
        const boosted = assessor.assess(op, { structuralContext: ['circular-deps'] });
        strict_1.default.equal(boosted.failurePatternMatch, true);
        strict_1.default.ok(boosted.score > baseline.score);
    });
});
(0, node_test_1.describe)('Full pipeline: execute → observe → calibrate → replay', () => {
    (0, node_test_1.it)('complete flow records all artifacts correctly', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const calibration = new RiskCalibration_js_1.RiskCalibration();
        const replayLog = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'pipeline-test' });
        const analyzer = new OutcomeAnalyzer_js_1.OutcomeAnalyzer();
        const op = ir.createOperation('rename_symbol', ['AuthManager']);
        op.payload = { newName: 'AuthService' };
        const transformation = ir.planTransformation([op]);
        const files = new Map([['auth.ts', 'export class AuthManager {}']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const execResult = executor.execute(transformation, ctx);
        const signals = [
            col.collect('test', 'success'),
            col.collect('typecheck', 'success'),
        ];
        const outcome = analyzer.analyze(transformation.id, 'rename_symbol', signals);
        calibration.observe('rename_symbol', execResult.risk.score, outcome.riskObserved);
        const replayEvent = replayLog.record(transformation.id, signals.map(s => s.id), outcome.id, false);
        strict_1.default.equal(execResult.success, true);
        strict_1.default.equal(outcome.outcome, 'success');
        strict_1.default.equal(replayEvent.causedRollback, false);
        strict_1.default.equal(replayLog.all().length, 1);
        strict_1.default.equal(calibration.summary().length, 1);
    });
});
//# sourceMappingURL=runtime-integration.test.js.map