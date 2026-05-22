"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SuccessPatternMemory_js_1 = require("../learning/SuccessPatternMemory.js");
const RuntimeLearningEngine_js_1 = require("../learning/RuntimeLearningEngine.js");
function makeSignal(type) {
    return { id: `sig-${type}`, signalType: type, status: 'success', source: 'test', timestamp: Date.now() };
}
function makeOutcome(outcome, riskObserved = 0) {
    return {
        id: 'out-1',
        operationId: 'op-1',
        outcome,
        signals: [makeSignal('typecheck'), makeSignal('test')],
        riskObserved,
        summary: [],
        timestamp: Date.now(),
    };
}
(0, node_test_1.describe)('SuccessPatternMemory', () => {
    (0, node_test_1.test)('records a new success pattern', () => {
        const mem = new SuccessPatternMemory_js_1.SuccessPatternMemory();
        const p = mem.record('rename', ['ctx-a', 'ctx-b'], 20);
        strict_1.default.equal(p.operationType, 'rename');
        strict_1.default.equal(p.successCount, 1);
        strict_1.default.equal(p.averageRisk, 20);
    });
    (0, node_test_1.test)('deduplicates similar patterns', () => {
        const mem = new SuccessPatternMemory_js_1.SuccessPatternMemory();
        mem.record('rename', ['ctx-a', 'ctx-b'], 20);
        mem.record('rename', ['ctx-a', 'ctx-b'], 30);
        strict_1.default.equal(mem.getAll().length, 1);
        strict_1.default.equal(mem.getAll()[0].successCount, 2);
    });
    (0, node_test_1.test)('averageRisk is updated correctly', () => {
        const mem = new SuccessPatternMemory_js_1.SuccessPatternMemory();
        mem.record('rename', ['ctx-a'], 20);
        mem.record('rename', ['ctx-a'], 40);
        const p = mem.getAll()[0];
        strict_1.default.equal(p.averageRisk, 30);
    });
    (0, node_test_1.test)('topBySuccessRate returns sorted results', () => {
        const mem = new SuccessPatternMemory_js_1.SuccessPatternMemory();
        mem.record('rename', ['ctx-a'], 10);
        mem.record('rename', ['ctx-a'], 10); // count=2
        mem.record('extract', ['ctx-b'], 5);
        const top = mem.topBySuccessRate(2);
        strict_1.default.equal(top[0].operationType, 'rename');
        strict_1.default.equal(top[0].successCount, 2);
    });
});
(0, node_test_1.describe)('RuntimeLearningEngine', () => {
    (0, node_test_1.test)('success outcome records success pattern', () => {
        const engine = new RuntimeLearningEngine_js_1.RuntimeLearningEngine();
        const result = engine.observe(makeOutcome('success', 10));
        strict_1.default.equal(result.outcome, 'success');
        strict_1.default.ok(result.successPatternId);
        strict_1.default.equal(engine.successMemory.getAll().length, 1);
    });
    (0, node_test_1.test)('failure outcome records failure pattern', () => {
        const engine = new RuntimeLearningEngine_js_1.RuntimeLearningEngine();
        const out = {
            id: 'out-1',
            operationId: 'op-1',
            outcome: 'failure',
            signals: [{ id: 'sig-1', signalType: 'build', status: 'failure', source: 'rename', timestamp: Date.now() }],
            riskObserved: 80,
            summary: [],
            timestamp: Date.now(),
        };
        const result = engine.observe(out);
        strict_1.default.equal(result.outcome, 'failure_learned');
        strict_1.default.ok(result.failureLearning?.patternRecorded);
        strict_1.default.ok(result.failureLearning?.patternId);
        strict_1.default.equal(engine.failureMemory.all().length, 1);
    });
    (0, node_test_1.test)('multiple outcomes build memory over time', () => {
        const engine = new RuntimeLearningEngine_js_1.RuntimeLearningEngine();
        const success = makeOutcome('success', 5);
        const fail = {
            id: 'out-2', operationId: 'op-2', outcome: 'failure',
            signals: [{ id: 's', signalType: 'test', status: 'failure', source: 'op', timestamp: Date.now() }],
            riskObserved: 60, summary: [], timestamp: Date.now(),
        };
        engine.observe(success);
        engine.observe(success);
        engine.observe(fail);
        strict_1.default.equal(engine.successMemory.getAll()[0].successCount, 2);
        strict_1.default.equal(engine.failureMemory.all().length, 1);
    });
});
//# sourceMappingURL=runtime-learning.test.js.map