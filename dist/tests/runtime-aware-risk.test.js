"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RuntimeAwareRiskAssessor_js_1 = require("../risk/RuntimeAwareRiskAssessor.js");
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
function makeOp(type) {
    return {
        id: 'op-1',
        operationType: type,
        targetSymbols: ['Foo'],
        constraints: [],
        expectedEffects: [],
        createdAt: Date.now(),
    };
}
(0, node_test_1.describe)('RuntimeAwareRiskAssessor', () => {
    (0, node_test_1.it)('base case: score matches base engine', () => {
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor();
        const result = assessor.assess(makeOp('rename_symbol'));
        strict_1.default.ok(result.score >= 10);
        strict_1.default.ok(result.calibratedScore >= 0);
    });
    (0, node_test_1.it)('runtime instability increases score', () => {
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor();
        const base = assessor.assess(makeOp('rename_symbol'));
        const boosted = assessor.assess(makeOp('rename_symbol'), { runtimeInstabilityScore: 50 });
        strict_1.default.ok(boosted.score > base.score);
    });
    (0, node_test_1.it)('failure pattern match boosts score', () => {
        const mem = new FailureMemory_js_1.FailureMemory();
        mem.record('move_function', ['x'], ['tests failed'], 8);
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor(mem);
        const result = assessor.assess(makeOp('move_function'), { structuralContext: ['x'] });
        strict_1.default.ok(result.failurePatternMatch);
        strict_1.default.ok(result.failurePatternIds.length > 0);
    });
    (0, node_test_1.it)('calibration adjusts predicted score', () => {
        const assessor = new RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor();
        assessor.calibration.observe('rename_symbol', 10, 30);
        const result = assessor.assess(makeOp('rename_symbol'));
        strict_1.default.ok(result.calibratedScore > result.score);
    });
});
//# sourceMappingURL=runtime-aware-risk.test.js.map