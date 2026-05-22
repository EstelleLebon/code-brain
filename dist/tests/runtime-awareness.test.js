"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RuntimeSignalCollector_js_1 = require("../runtime-awareness/RuntimeSignalCollector.js");
const RuntimeSignalAggregator_js_1 = require("../runtime-awareness/RuntimeSignalAggregator.js");
const RuntimeSignal_js_1 = require("../runtime-awareness/RuntimeSignal.js");
(0, node_test_1.describe)('RuntimeSignalCollector', () => {
    (0, node_test_1.it)('creates a signal with correct type and status', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'test' });
        const sig = col.collect('test', 'success', { suite: 'unit' }, 42);
        strict_1.default.equal(sig.signalType, 'test');
        strict_1.default.equal(sig.status, 'success');
        strict_1.default.equal(sig.durationMs, 42);
        strict_1.default.equal(sig.source, 'test');
    });
    (0, node_test_1.it)('fromExitCode: exit 0 → success, exit 1 → failure', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'ci' });
        strict_1.default.equal(col.fromExitCode('build', 0).status, 'success');
        strict_1.default.equal(col.fromExitCode('build', 1).status, 'failure');
        strict_1.default.equal(col.fromExitCode('build', 2).status, 'warning');
    });
});
(0, node_test_1.describe)('RuntimeSignalAggregator', () => {
    (0, node_test_1.it)('overall status is failure when any signal fails', () => {
        const agg = new RuntimeSignalAggregator_js_1.RuntimeSignalAggregator();
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        agg.add(col.collect('test', 'success'));
        agg.add(col.collect('build', 'failure'));
        const result = agg.aggregate();
        strict_1.default.equal(result.overallStatus, 'failure');
        strict_1.default.equal(result.hasFailures, true);
    });
    (0, node_test_1.it)('overall status is success when all pass', () => {
        const agg = new RuntimeSignalAggregator_js_1.RuntimeSignalAggregator();
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        agg.add(col.collect('test', 'success'));
        agg.add(col.collect('typecheck', 'success'));
        strict_1.default.equal(agg.aggregate().overallStatus, 'success');
    });
    (0, node_test_1.it)('forType filters correctly', () => {
        const agg = new RuntimeSignalAggregator_js_1.RuntimeSignalAggregator();
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        agg.add(col.collect('test', 'success'));
        agg.add(col.collect('lint', 'warning'));
        strict_1.default.equal(agg.forType('test').length, 1);
        strict_1.default.equal(agg.forType('lint').length, 1);
        strict_1.default.equal(agg.forType('build').length, 0);
    });
});
(0, node_test_1.describe)('createSnapshot', () => {
    (0, node_test_1.it)('produces correct summary counts', () => {
        const col = new RuntimeSignalCollector_js_1.RuntimeSignalCollector({ source: 'x' });
        const signals = [
            col.collect('test', 'success'),
            col.collect('build', 'failure'),
            col.collect('lint', 'warning'),
        ];
        const snap = (0, RuntimeSignal_js_1.createSnapshot)('op-1', signals);
        strict_1.default.equal(snap.summary.total, 3);
        strict_1.default.equal(snap.summary.success, 1);
        strict_1.default.equal(snap.summary.failure, 1);
        strict_1.default.equal(snap.summary.warning, 1);
        strict_1.default.equal(snap.operationId, 'op-1');
    });
});
//# sourceMappingURL=runtime-awareness.test.js.map