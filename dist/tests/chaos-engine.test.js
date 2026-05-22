"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ChaosEngine_js_1 = require("../chaos-engineering/ChaosEngine.js");
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
const ChaosPolicy_js_1 = require("../chaos-engineering/ChaosPolicy.js");
(0, node_test_1.describe)('ChaosEngine', () => {
    let engine;
    (0, node_test_1.beforeEach)(() => {
        engine = new ChaosEngine_js_1.ChaosEngine(new FaultInjection_js_1.FaultInjector(13), 'SAFE');
    });
    (0, node_test_1.afterEach)(() => {
        engine.stop();
    });
    (0, node_test_1.it)('starts in idle status', () => {
        strict_1.default.equal(engine.status(), 'idle');
    });
    (0, node_test_1.it)('status becomes stopped after stop()', () => {
        engine.start(1000);
        engine.stop();
        strict_1.default.equal(engine.status(), 'stopped');
    });
    (0, node_test_1.it)('tick injects faults within policy limits', () => {
        engine.start(10000); // long interval so we control ticks manually
        engine.stop(); // stop timer but keep state
        const engine2 = new ChaosEngine_js_1.ChaosEngine(new FaultInjection_js_1.FaultInjector(13), 'BALANCED');
        const result = engine2.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
        strict_1.default.ok(typeof result.faultsInjected === 'number');
        strict_1.default.equal(result.aborted, false);
        engine2.stop();
    });
    (0, node_test_1.it)('tick aborts on catastrophic instability', () => {
        const result = engine.tick({ trustScore: 0.0, rollbackDepth: 100, replanRate: 0 });
        strict_1.default.equal(result.aborted, true);
        strict_1.default.equal(engine.status(), 'aborted');
    });
    (0, node_test_1.it)('applyPolicy changes the active policy', () => {
        engine.applyPolicy('NUCLEAR');
        strict_1.default.equal(engine.policy().level, 'NUCLEAR');
    });
    (0, node_test_1.it)('NUCLEAR policy has more concurrent faults than SAFE', () => {
        const safe = ChaosPolicy_js_1.CHAOS_POLICIES['SAFE'];
        const nuclear = ChaosPolicy_js_1.CHAOS_POLICIES['NUCLEAR'];
        strict_1.default.ok(nuclear.maxConcurrentFaults > safe.maxConcurrentFaults);
    });
    (0, node_test_1.it)('SAFE policy auto-aborts at lower rollback depth', () => {
        const safe = ChaosPolicy_js_1.CHAOS_POLICIES['SAFE'];
        const nuclear = ChaosPolicy_js_1.CHAOS_POLICIES['NUCLEAR'];
        strict_1.default.ok(safe.autoAbortThresholds.maxRollbackDepth < nuclear.autoAbortThresholds.maxRollbackDepth);
    });
    (0, node_test_1.it)('tickHistory records each tick result', () => {
        engine.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
        engine.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
        strict_1.default.ok(engine.tickHistory().length >= 1);
    });
    (0, node_test_1.it)('stop clears active faults', () => {
        engine.start(10000);
        engine.stop();
        const active = engine.injector().activeFaults();
        strict_1.default.equal(active.length, 0);
    });
    (0, node_test_1.it)('does not throw on repeated stop()', () => {
        engine.stop();
        engine.stop();
        strict_1.default.equal(engine.status(), 'stopped');
    });
    (0, node_test_1.it)('all policy levels are defined', () => {
        const levels = ['SAFE', 'BALANCED', 'AGGRESSIVE', 'NUCLEAR'];
        for (const level of levels) {
            strict_1.default.ok(ChaosPolicy_js_1.CHAOS_POLICIES[level]);
            strict_1.default.ok(ChaosPolicy_js_1.CHAOS_POLICIES[level].maxConcurrentFaults > 0);
        }
    });
});
//# sourceMappingURL=chaos-engine.test.js.map