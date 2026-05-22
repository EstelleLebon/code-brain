"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const StrategyMemory_js_1 = require("../strategic-memory/StrategyMemory.js");
const PlanningHeuristics_js_1 = require("../strategic-memory/PlanningHeuristics.js");
function makeRecord(goalType, success, rollbackCount = 0) {
    return {
        goalType,
        cognitiveMode: 'exploratory',
        success,
        executionTimeMs: 1000,
        stepsCount: 5,
        rollbackCount,
        timestamp: new Date(),
    };
}
(0, node_test_1.describe)('StrategyMemory', () => {
    (0, node_test_1.test)('recordStrategy and retrieve bestStrategies', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        mem.recordStrategy(makeRecord('refactor', true));
        mem.recordStrategy(makeRecord('refactor', false));
        const best = mem.bestStrategies('refactor');
        strict_1.default.equal(best.length, 1);
        strict_1.default.equal(best[0].success, true);
    });
    (0, node_test_1.test)('failurePatterns returns only failures', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        mem.recordStrategy(makeRecord('repair', true));
        mem.recordStrategy(makeRecord('repair', false));
        mem.recordStrategy(makeRecord('repair', false));
        const failures = mem.failurePatterns('repair');
        strict_1.default.equal(failures.length, 2);
    });
    (0, node_test_1.test)('averageSuccessRate calculates correctly', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        mem.recordStrategy(makeRecord('cleanup', true));
        mem.recordStrategy(makeRecord('cleanup', true));
        mem.recordStrategy(makeRecord('cleanup', false));
        const rate = mem.averageSuccessRate('cleanup');
        strict_1.default.ok(Math.abs(rate - 2 / 3) < 0.001);
    });
    (0, node_test_1.test)('averageSuccessRate returns 0 for unknown type', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        strict_1.default.equal(mem.averageSuccessRate('optimize'), 0);
    });
});
(0, node_test_1.describe)('PlanningHeuristics', () => {
    (0, node_test_1.test)('preferSmallPlans is true when failure rate high', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        for (let i = 0; i < 3; i++)
            mem.recordStrategy(makeRecord('refactor', false));
        const h = new PlanningHeuristics_js_1.PlanningHeuristics(mem);
        strict_1.default.equal(h.preferSmallPlans('refactor'), true);
    });
    (0, node_test_1.test)('preferSmallPlans is false when mostly successful', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        for (let i = 0; i < 5; i++)
            mem.recordStrategy(makeRecord('cleanup', true));
        const h = new PlanningHeuristics_js_1.PlanningHeuristics(mem);
        strict_1.default.equal(h.preferSmallPlans('cleanup'), false);
    });
    (0, node_test_1.test)('preferParallelism is true for stable history', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        for (let i = 0; i < 5; i++)
            mem.recordStrategy(makeRecord('refactor', true, 0));
        const h = new PlanningHeuristics_js_1.PlanningHeuristics(mem);
        strict_1.default.equal(h.preferParallelism('refactor'), true);
    });
    (0, node_test_1.test)('isDangerousPattern detects repeated mode failures', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        mem.recordStrategy({ ...makeRecord('repair', false), cognitiveMode: 'surgical' });
        mem.recordStrategy({ ...makeRecord('repair', false), cognitiveMode: 'surgical' });
        const h = new PlanningHeuristics_js_1.PlanningHeuristics(mem);
        strict_1.default.equal(h.isDangerousPattern('repair', 'surgical'), true);
    });
    (0, node_test_1.test)('shouldReduceMutations when high rollback average', () => {
        const mem = new StrategyMemory_js_1.StrategyMemory();
        mem.recordStrategy(makeRecord('migrate', false, 5));
        mem.recordStrategy(makeRecord('migrate', false, 4));
        const h = new PlanningHeuristics_js_1.PlanningHeuristics(mem);
        strict_1.default.equal(h.shouldReduceMutations('migrate'), true);
    });
});
//# sourceMappingURL=strategic-memory.test.js.map