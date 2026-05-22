"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ExecutionFingerprint_js_1 = require("../reproducibility/ExecutionFingerprint.js");
function input(overrides = {}) {
    return {
        executionId: 'exec-1',
        planTopology: 'step-a,step-b,step-c',
        mutations: ['mut-1', 'mut-2'],
        runtimeSignals: { cpuLoad: 0.3 },
        events: ['goal_created', 'step_executed'],
        cognitiveMode: 'focused',
        trustLevel: 0.9,
        ...overrides,
    };
}
(0, node_test_1.describe)('ExecutionFingerprint', () => {
    (0, node_test_1.it)('creates a fingerprint with components and hash', () => {
        const fp = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        strict_1.default.ok(fp.hash.length > 0);
        strict_1.default.ok(fp.components.length > 0);
        strict_1.default.equal(fp.executionId, 'exec-1');
        strict_1.default.ok(fp.createdAt instanceof Date);
    });
    (0, node_test_1.it)('same input produces same hash', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        strict_1.default.equal(fp1.hash, fp2.hash);
    });
    (0, node_test_1.it)('different trust level produces different hash', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ trustLevel: 0.9 }));
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ trustLevel: 0.1 }));
        strict_1.default.notEqual(fp1.hash, fp2.hash);
    });
    (0, node_test_1.it)('different cognitive mode produces different hash', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ cognitiveMode: 'focused' }));
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ cognitiveMode: 'exploratory' }));
        strict_1.default.notEqual(fp1.hash, fp2.hash);
    });
    (0, node_test_1.it)('compareFingerprints returns identical=true for same input', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        const diff = (0, ExecutionFingerprint_js_1.compareFingerprints)(fp1, fp2);
        strict_1.default.equal(diff.identical, true);
        strict_1.default.equal(diff.similarityScore, 1);
        strict_1.default.equal(diff.diverging.length, 0);
    });
    (0, node_test_1.it)('compareFingerprints detects diverging components', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ cognitiveMode: 'focused' }));
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ cognitiveMode: 'exploratory' }));
        const diff = (0, ExecutionFingerprint_js_1.compareFingerprints)(fp1, fp2);
        strict_1.default.equal(diff.identical, false);
        strict_1.default.ok(diff.diverging.some(d => d.label === 'cognitive_mode'));
    });
    (0, node_test_1.it)('similarity score is between 0 and 1', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input());
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ cognitiveMode: 'x', trustLevel: 0.1, planTopology: 'y' }));
        const diff = (0, ExecutionFingerprint_js_1.compareFingerprints)(fp1, fp2);
        strict_1.default.ok(diff.similarityScore >= 0 && diff.similarityScore <= 1);
    });
    (0, node_test_1.it)('handles missing optional fields gracefully', () => {
        const fp = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'bare' });
        strict_1.default.ok(fp.hash.length > 0);
    });
    (0, node_test_1.it)('mutation order does not affect hash (sorted)', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ mutations: ['a', 'b', 'c'] }));
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)(input({ mutations: ['c', 'a', 'b'] }));
        strict_1.default.equal(fp1.hash, fp2.hash);
    });
});
//# sourceMappingURL=reproducibility.test.js.map