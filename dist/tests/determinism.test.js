"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DeterminismValidator_js_1 = require("../reproducibility/DeterminismValidator.js");
const ExecutionFingerprint_js_1 = require("../reproducibility/ExecutionFingerprint.js");
(0, node_test_1.describe)('DeterminismValidator', () => {
    let validator;
    (0, node_test_1.beforeEach)(() => {
        validator = new DeterminismValidator_js_1.DeterminismValidator();
    });
    (0, node_test_1.it)('validateReplay warns with fewer than 2 fingerprints', () => {
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e1' }));
        const result = validator.validateReplay('e1');
        strict_1.default.equal(result.result, 'warn');
    });
    (0, node_test_1.it)('validateReplay passes for identical replays', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e2', cognitiveMode: 'focused' });
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e2', cognitiveMode: 'focused' });
        validator.registerFingerprint(fp1);
        validator.registerFingerprint(fp2);
        const result = validator.validateReplay('e2');
        strict_1.default.equal(result.result, 'pass');
        strict_1.default.equal(result.similarity, 1);
    });
    (0, node_test_1.it)('validateReplay fails on high divergence', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({
            executionId: 'e3',
            cognitiveMode: 'focused',
            trustLevel: 0.9,
            planTopology: 'a,b,c',
            mutations: ['x'],
            events: ['start'],
        });
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({
            executionId: 'e3',
            cognitiveMode: 'exploratory',
            trustLevel: 0.1,
            planTopology: 'z,y',
            mutations: ['q', 'r'],
            events: ['end'],
        });
        validator.registerFingerprint(fp1);
        validator.registerFingerprint(fp2);
        const result = validator.validateReplay('e3');
        strict_1.default.ok(['warn', 'fail'].includes(result.result));
    });
    (0, node_test_1.it)('validateSnapshots returns pass when all hashes match', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e4', cognitiveMode: 'focused' });
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e4', cognitiveMode: 'focused' });
        validator.registerFingerprint(fp1);
        validator.registerFingerprint(fp2);
        const result = validator.validateSnapshots('e4');
        strict_1.default.equal(result, 'pass');
    });
    (0, node_test_1.it)('validateSnapshots returns warn/fail on hash mismatch', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e5', cognitiveMode: 'a' });
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e5', cognitiveMode: 'b' });
        const fp3 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e5', cognitiveMode: 'c' });
        validator.registerFingerprint(fp1);
        validator.registerFingerprint(fp2);
        validator.registerFingerprint(fp3);
        const result = validator.validateSnapshots('e5');
        strict_1.default.ok(['warn', 'fail'].includes(result));
    });
    (0, node_test_1.it)('validateDeterminism returns overall report', () => {
        const fp1 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e6', cognitiveMode: 'focused' });
        const fp2 = (0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e6', cognitiveMode: 'focused' });
        validator.registerFingerprint(fp1);
        validator.registerFingerprint(fp2);
        const report = validator.validateDeterminism('e6');
        strict_1.default.equal(report.executionId, 'e6');
        strict_1.default.ok(['pass', 'warn', 'fail'].includes(report.overall));
        strict_1.default.ok(Array.isArray(report.notes));
    });
    (0, node_test_1.it)('reset clears fingerprints for specific executionId', () => {
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e7' }));
        validator.reset('e7');
        const result = validator.validateReplay('e7');
        strict_1.default.equal(result.result, 'warn');
        strict_1.default.ok(result.notes[0].includes('fewer than 2'));
    });
    (0, node_test_1.it)('reset without args clears all', () => {
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e8' }));
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)({ executionId: 'e9' }));
        validator.reset();
        strict_1.default.equal(validator.validateReplay('e8').result, 'warn');
        strict_1.default.equal(validator.validateReplay('e9').result, 'warn');
    });
    (0, node_test_1.it)('overall pass when all sub-checks pass', () => {
        const base = { executionId: 'e10', cognitiveMode: 'stable', trustLevel: 0.9 };
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)(base));
        validator.registerFingerprint((0, ExecutionFingerprint_js_1.fingerprintExecution)(base));
        const report = validator.validateDeterminism('e10');
        strict_1.default.equal(report.overall, 'pass');
    });
});
//# sourceMappingURL=determinism.test.js.map