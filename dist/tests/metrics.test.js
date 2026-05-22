"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const CognitiveMetrics_js_1 = require("../metrics/CognitiveMetrics.js");
const RuntimeHealthMetrics_js_1 = require("../metrics/RuntimeHealthMetrics.js");
const MetricsAggregator_js_1 = require("../metrics/MetricsAggregator.js");
function makeSignal(type, status) {
    return { id: `s-${Math.random()}`, signalType: type, status, source: 'test', timestamp: Date.now() };
}
function goodObs() {
    return { success: true, hadRollback: false, retrievalHits: 8, retrievalTotal: 10, hadContradiction: false, runtimePassed: true, calibrationDelta: 0.05 };
}
function badObs() {
    return { success: false, hadRollback: true, retrievalHits: 2, retrievalTotal: 10, hadContradiction: true, runtimePassed: false, calibrationDelta: 0.4 };
}
(0, node_test_1.describe)('CognitiveMetrics', () => {
    (0, node_test_1.test)('empty metrics returns neutral snapshot', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics();
        const snap = m.snapshot();
        strict_1.default.equal(snap.retrievalPrecision, 0.5);
        strict_1.default.equal(snap.contradictionRate, 0);
        strict_1.default.equal(snap.rollbackFrequency, 0);
        strict_1.default.equal(snap.runtimeStability, 1);
    });
    (0, node_test_1.test)('records observations and computes rates', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics();
        m.record(goodObs());
        m.record(goodObs());
        m.record(badObs());
        const snap = m.snapshot();
        strict_1.default.ok(snap.runtimeStability > 0 && snap.runtimeStability < 1);
        strict_1.default.ok(snap.retrievalPrecision > 0.5); // 2 good, 1 bad
    });
    (0, node_test_1.test)('rollback frequency matches bad observations', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics();
        m.record(goodObs());
        m.record(badObs());
        const snap = m.snapshot();
        strict_1.default.ok(Math.abs(snap.rollbackFrequency - 0.5) < 0.01);
    });
    (0, node_test_1.test)('contradiction rate computed correctly', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics();
        m.record(goodObs());
        m.record(badObs());
        const snap = m.snapshot();
        strict_1.default.ok(Math.abs(snap.contradictionRate - 0.5) < 0.01);
    });
    (0, node_test_1.test)('health snapshot returns values in [0,1]', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics();
        m.record(goodObs());
        const h = m.healthSnapshot();
        for (const [key, val] of Object.entries(h)) {
            strict_1.default.ok(val >= 0 && val <= 1, `${key}=${val} out of range`);
        }
    });
    (0, node_test_1.test)('windowSize evicts old observations', () => {
        const m = new CognitiveMetrics_js_1.CognitiveMetrics(3);
        m.record(badObs());
        m.record(badObs());
        m.record(badObs());
        m.record(goodObs()); // evicts first bad
        m.record(goodObs()); // evicts second bad
        m.record(goodObs()); // evicts third bad
        const snap = m.snapshot();
        strict_1.default.equal(snap.rollbackFrequency, 0);
    });
});
(0, node_test_1.describe)('RuntimeHealthMetrics', () => {
    (0, node_test_1.test)('empty → overallHealth 1', () => {
        const m = new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
        strict_1.default.equal(m.report().overallHealth, 1);
    });
    (0, node_test_1.test)('all pass → overallHealth 1', () => {
        const m = new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
        m.ingest(makeSignal('test', 'success'));
        m.ingest(makeSignal('build', 'success'));
        strict_1.default.equal(m.report().overallHealth, 1);
    });
    (0, node_test_1.test)('all fail → overallHealth 0', () => {
        const m = new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
        m.ingest(makeSignal('test', 'failure'));
        m.ingest(makeSignal('build', 'failure'));
        strict_1.default.equal(m.report().overallHealth, 0);
    });
    (0, node_test_1.test)('byType tracks per-signal-type stats', () => {
        const m = new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
        m.ingest(makeSignal('test', 'success'));
        m.ingest(makeSignal('test', 'failure'));
        m.ingest(makeSignal('build', 'success'));
        const r = m.report();
        const testStats = r.byType.get('test');
        strict_1.default.equal(testStats.pass, 1);
        strict_1.default.equal(testStats.fail, 1);
    });
    (0, node_test_1.test)('warning counts as 0.5 health', () => {
        const m = new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
        m.ingest(makeSignal('lint', 'warning'));
        m.ingest(makeSignal('lint', 'warning'));
        const r = m.report();
        strict_1.default.ok(Math.abs(r.overallHealth - 0.5) < 0.01);
    });
});
(0, node_test_1.describe)('MetricsAggregator', () => {
    (0, node_test_1.test)('recordExecution feeds both cognitive and runtime', () => {
        const agg = new MetricsAggregator_js_1.MetricsAggregator();
        const signals = [makeSignal('test', 'success'), makeSignal('build', 'failure')];
        agg.recordExecution({ ...goodObs(), signals });
        const runtimeReport = agg.runtime.report();
        strict_1.default.equal(runtimeReport.totalSignals, 2);
    });
    (0, node_test_1.test)('overallStabilityScore is in [0,1]', () => {
        const agg = new MetricsAggregator_js_1.MetricsAggregator();
        agg.recordExecution({ ...goodObs() });
        const score = agg.overallStabilityScore();
        strict_1.default.ok(score >= 0 && score <= 1);
    });
    (0, node_test_1.test)('cognitiveHealth returns proper snapshot', () => {
        const agg = new MetricsAggregator_js_1.MetricsAggregator();
        agg.recordExecution({ ...goodObs() });
        const h = agg.cognitiveHealth(0.8, 0.9);
        strict_1.default.ok(h.trustHealth > 0);
    });
});
//# sourceMappingURL=metrics.test.js.map