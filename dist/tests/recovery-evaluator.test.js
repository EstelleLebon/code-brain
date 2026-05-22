"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RecoveryEvaluator_js_1 = require("../reliability/RecoveryEvaluator.js");
(0, node_test_1.describe)('RecoveryEvaluator', () => {
    let evaluator;
    (0, node_test_1.beforeEach)(() => {
        evaluator = new RecoveryEvaluator_js_1.RecoveryEvaluator();
    });
    (0, node_test_1.it)('evaluates an excellent recovery', () => {
        const outcome = evaluator.evaluate({
            executionId: 'e1',
            rollbackDepth: 0,
            recoveryDurationMs: 50,
            collateralSteps: 0,
            repeatedFailures: 0,
            eventualSuccess: true,
        });
        strict_1.default.equal(outcome.quality, 'excellent');
        strict_1.default.ok(outcome.score >= 0.8);
    });
    (0, node_test_1.it)('evaluates a catastrophic recovery', () => {
        const outcome = evaluator.evaluate({
            executionId: 'e2',
            rollbackDepth: 10,
            recoveryDurationMs: 8000,
            collateralSteps: 8,
            repeatedFailures: 5,
            eventualSuccess: false,
        });
        strict_1.default.equal(outcome.quality, 'catastrophic');
        strict_1.default.ok(outcome.score < 0.2);
    });
    (0, node_test_1.it)('eventualSuccess=false reduces score significantly', () => {
        const success = evaluator.evaluate({
            executionId: 'e3',
            rollbackDepth: 1,
            recoveryDurationMs: 100,
            collateralSteps: 0,
            repeatedFailures: 0,
            eventualSuccess: true,
        });
        const failure = evaluator.evaluate({
            executionId: 'e4',
            rollbackDepth: 1,
            recoveryDurationMs: 100,
            collateralSteps: 0,
            repeatedFailures: 0,
            eventualSuccess: false,
        });
        strict_1.default.ok(success.score > failure.score);
    });
    (0, node_test_1.it)('summary returns all outcomes', () => {
        evaluator.evaluate({
            executionId: 'a', rollbackDepth: 0, recoveryDurationMs: 100,
            collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
        });
        evaluator.evaluate({
            executionId: 'b', rollbackDepth: 5, recoveryDurationMs: 3000,
            collateralSteps: 3, repeatedFailures: 2, eventualSuccess: false,
        });
        const summary = evaluator.summary();
        strict_1.default.equal(summary.outcomes.length, 2);
        strict_1.default.ok(summary.worstCase);
        strict_1.default.ok(summary.bestCase);
        strict_1.default.ok(summary.bestCase.score >= summary.worstCase.score);
    });
    (0, node_test_1.it)('quality distribution counts correctly', () => {
        evaluator.evaluate({
            executionId: 'x', rollbackDepth: 0, recoveryDurationMs: 50,
            collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
        });
        const summary = evaluator.summary();
        strict_1.default.equal(summary.qualityDistribution.excellent, 1);
    });
    (0, node_test_1.it)('meanScore is average of all scores', () => {
        const a = evaluator.evaluate({
            executionId: 'a', rollbackDepth: 0, recoveryDurationMs: 50,
            collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
        });
        const b = evaluator.evaluate({
            executionId: 'b', rollbackDepth: 10, recoveryDurationMs: 9000,
            collateralSteps: 5, repeatedFailures: 3, eventualSuccess: false,
        });
        const summary = evaluator.summary();
        const expected = (a.score + b.score) / 2;
        strict_1.default.ok(Math.abs(summary.meanScore - expected) < 0.001);
    });
    (0, node_test_1.it)('reset clears all outcomes', () => {
        evaluator.evaluate({
            executionId: 'z', rollbackDepth: 0, recoveryDurationMs: 10,
            collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
        });
        evaluator.reset();
        const summary = evaluator.summary();
        strict_1.default.equal(summary.outcomes.length, 0);
        strict_1.default.equal(summary.meanScore, 1);
    });
    (0, node_test_1.it)('poor quality classification', () => {
        const outcome = evaluator.evaluate({
            executionId: 'p', rollbackDepth: 4,
            recoveryDurationMs: 4000,
            collateralSteps: 3,
            repeatedFailures: 1,
            eventualSuccess: false,
        });
        strict_1.default.ok(['poor', 'catastrophic'].includes(outcome.quality));
    });
});
//# sourceMappingURL=recovery-evaluator.test.js.map