"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const VectorClock_js_1 = require("../distributed-memory/VectorClock.js");
const MemoryReconciliation_js_1 = require("../distributed-memory/MemoryReconciliation.js");
const DivergenceClassifier_js_1 = require("../distributed-memory/DivergenceClassifier.js");
function makeEntry(overrides) {
    return {
        value: 'default',
        version: 1,
        confidence: 0.8,
        timestamp: 100,
        ...overrides,
    };
}
(0, node_test_1.describe)('VectorClock', () => {
    (0, node_test_1.it)('increment() increases node counter', () => {
        const vc = new VectorClock_js_1.VectorClock();
        vc.increment('n1');
        strict_1.default.equal(vc.toJSON()['n1'], 1);
        vc.increment('n1');
        strict_1.default.equal(vc.toJSON()['n1'], 2);
    });
    (0, node_test_1.it)('merge() takes component-wise max', () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 3, n2: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 1, n2: 5 });
        const merged = a.merge(b);
        strict_1.default.equal(merged.toJSON()['n1'], 3);
        strict_1.default.equal(merged.toJSON()['n2'], 5);
    });
    (0, node_test_1.it)("compare() returns 'equal' for equal clocks", () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 1 });
        strict_1.default.equal(a.compare(b), 'equal');
    });
    (0, node_test_1.it)("compare() returns 'before' when all components less", () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 2 });
        strict_1.default.equal(a.compare(b), 'before');
    });
    (0, node_test_1.it)("compare() returns 'after' when all components greater", () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 3 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 1 });
        strict_1.default.equal(a.compare(b), 'after');
    });
    (0, node_test_1.it)("compare() returns 'concurrent' for conflicting updates", () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 2, n2: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 1, n2: 3 });
        strict_1.default.equal(a.compare(b), 'concurrent');
    });
    (0, node_test_1.it)('concurrent() reflects compare()', () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 2, n2: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 1, n2: 3 });
        strict_1.default.equal(a.concurrent(b), true);
    });
    (0, node_test_1.it)('causalBefore() reflects compare()', () => {
        const a = VectorClock_js_1.VectorClock.fromJSON({ n1: 1 });
        const b = VectorClock_js_1.VectorClock.fromJSON({ n1: 2 });
        strict_1.default.equal(a.causalBefore(b), true);
        strict_1.default.equal(b.causalBefore(a), false);
    });
    (0, node_test_1.it)('toJSON()/fromJSON() roundtrip', () => {
        const vc = VectorClock_js_1.VectorClock.fromJSON({ n1: 5, n2: 3 });
        const json = vc.toJSON();
        const restored = VectorClock_js_1.VectorClock.fromJSON(json);
        strict_1.default.deepEqual(restored.toJSON(), { n1: 5, n2: 3 });
    });
});
(0, node_test_1.describe)('MemoryReconciliation', () => {
    (0, node_test_1.it)('reconcile() last_write_wins picks highest timestamp', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'old', timestamp: 100 }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'new', timestamp: 200 }),
        ];
        const result = rec.reconcile(entries, 'last_write_wins');
        strict_1.default.equal(result.resolvedValue, 'new');
    });
    (0, node_test_1.it)('reconcile() confidence_merge picks highest confidence', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'low', confidence: 0.3 }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'high', confidence: 0.9 }),
        ];
        const result = rec.reconcile(entries, 'confidence_merge');
        strict_1.default.equal(result.resolvedValue, 'high');
    });
    (0, node_test_1.it)('reconcile() semantic_merge concatenates string values', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'part1' }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'part2' }),
        ];
        const result = rec.reconcile(entries, 'semantic_merge');
        strict_1.default.ok(String(result.resolvedValue).includes('part1'));
        strict_1.default.ok(String(result.resolvedValue).includes('part2'));
    });
    (0, node_test_1.it)('reconcile() contradiction_aware detects high-confidence contradictions', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'v1', confidence: 0.9 }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'v2', confidence: 0.95 }),
        ];
        const result = rec.reconcile(entries, 'contradiction_aware');
        strict_1.default.equal(result.conflictDetected, true);
    });
    (0, node_test_1.it)('reconcileAll() applies to all keys in map', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const map = new Map([
            ['k1', [makeEntry({ key: 'k1', nodeId: 'n1', value: 'a', timestamp: 100 }), makeEntry({ key: 'k1', nodeId: 'n2', value: 'b', timestamp: 200 })]],
            ['k2', [makeEntry({ key: 'k2', nodeId: 'n1', value: 'x', timestamp: 50 })]],
        ]);
        const results = rec.reconcileAll(map, 'last_write_wins');
        strict_1.default.equal(results.size, 2);
        strict_1.default.equal(results.get('k1').resolvedValue, 'b');
    });
});
(0, node_test_1.describe)('DivergenceClassifier', () => {
    (0, node_test_1.it)("classify() benign for zero contradictions", () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const result = dc.classify({ contradictionCount: 0, confidenceDrift: 0.1, replayMismatch: false, consensusMismatch: false });
        strict_1.default.equal(result.severity, 'benign');
    });
    (0, node_test_1.it)("classify() recoverable for 1-2 contradictions low drift", () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const result = dc.classify({ contradictionCount: 1, confidenceDrift: 0.1, replayMismatch: false, consensusMismatch: false });
        strict_1.default.equal(result.severity, 'recoverable');
    });
    (0, node_test_1.it)("classify() dangerous for >2 contradictions", () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const result = dc.classify({ contradictionCount: 3, confidenceDrift: 0.1, replayMismatch: false, consensusMismatch: false });
        strict_1.default.equal(result.severity, 'dangerous');
    });
    (0, node_test_1.it)("classify() catastrophic for >5 contradictions + consensusMismatch", () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const result = dc.classify({ contradictionCount: 6, confidenceDrift: 0.1, replayMismatch: false, consensusMismatch: true });
        strict_1.default.equal(result.severity, 'catastrophic');
    });
    (0, node_test_1.it)('classifyEntries() computes metrics from entries', () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'v1', confidence: 0.9 }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'v2', confidence: 0.95 }),
        ];
        const result = dc.classifyEntries(entries, false, false);
        strict_1.default.ok(result.severity !== undefined);
        strict_1.default.ok(result.metrics.contradictionCount >= 1);
    });
    (0, node_test_1.it)('classifyEntries() detects confidence drift', () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const entries = [
            makeEntry({ key: 'k1', nodeId: 'n1', value: 'v1', confidence: 0.1 }),
            makeEntry({ key: 'k1', nodeId: 'n2', value: 'v1', confidence: 0.95 }),
        ];
        const result = dc.classifyEntries(entries, false, false);
        strict_1.default.ok(result.metrics.confidenceDrift > 0.5);
    });
});
//# sourceMappingURL=reconciliation.test.js.map