"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ContradictionDetector_js_1 = require("../contradictions/ContradictionDetector.js");
const index_js_1 = require("../types/index.js");
function makeClaim(id, symbolId, claim) {
    return {
        id,
        symbolId,
        claim,
        confidence: 1.0,
        sourceHash: 'abc123',
        truthLevel: index_js_1.TruthLevel.DERIVED,
    };
}
(0, node_test_1.describe)('ContradictionDetector', () => {
    (0, node_test_1.test)('detect() finds numeric contradiction for same symbol', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const claims = [
            makeClaim('c1', 'sym_001', 'Function has 3 parameters'),
            makeClaim('c2', 'sym_001', 'Function has 5 parameters'),
        ];
        const contradictions = detector.detect(claims);
        strict_1.default.ok(contradictions.length >= 1, 'Should detect at least one contradiction');
        strict_1.default.equal(contradictions[0].kind, 'claim_vs_claim');
    });
    (0, node_test_1.test)('detect() finds boolean contradiction (exported vs not exported)', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const claims = [
            makeClaim('c1', 'sym_002', 'Symbol is exported'),
            makeClaim('c2', 'sym_002', 'Symbol is not exported'),
        ];
        const contradictions = detector.detect(claims);
        strict_1.default.ok(contradictions.length >= 1, 'Should detect boolean contradiction');
    });
    (0, node_test_1.test)('detect() does NOT flag claims from different symbols', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const claims = [
            makeClaim('c1', 'sym_a', 'Function has 3 parameters'),
            makeClaim('c2', 'sym_b', 'Function has 5 parameters'),
        ];
        const contradictions = detector.detect(claims);
        strict_1.default.equal(contradictions.length, 0, 'Different symbols should not contradict');
    });
    (0, node_test_1.test)('detect() does NOT flag identical claims', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const claims = [
            makeClaim('c1', 'sym_z', 'Function has 3 parameters'),
            makeClaim('c2', 'sym_z', 'Function has 3 parameters'),
        ];
        const contradictions = detector.detect(claims);
        strict_1.default.equal(contradictions.length, 0, 'Identical claims should not be flagged');
    });
    (0, node_test_1.test)('report() aggregates correctly', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const claims = [
            makeClaim('c1', 'sym_001', 'Function has 2 parameters'),
            makeClaim('c2', 'sym_001', 'Function has 4 parameters'),
            makeClaim('c3', 'sym_002', 'Symbol is exported'),
            makeClaim('c4', 'sym_002', 'Symbol is not exported'),
        ];
        const contradictions = detector.detect(claims);
        const report = detector.report(contradictions);
        strict_1.default.ok(report.totalCount >= 2, 'Should report at least 2 contradictions');
        strict_1.default.equal(report.contradictions.length, report.totalCount);
        strict_1.default.ok(report.bySeverity['medium'] >= 0 || report.bySeverity['high'] >= 0);
        strict_1.default.ok(report.byKind['claim_vs_claim'] >= 2, 'All should be claim_vs_claim kind');
    });
    (0, node_test_1.test)('onDetected handler is called for each contradiction', () => {
        const detector = new ContradictionDetector_js_1.ContradictionDetector();
        const detected = [];
        detector.onDetected(c => detected.push(c.id));
        const claims = [
            makeClaim('c1', 'sym_001', 'Function has 1 parameters'),
            makeClaim('c2', 'sym_001', 'Function has 9 parameters'),
        ];
        detector.detect(claims);
        strict_1.default.ok(detected.length >= 1, 'Handler should have been called');
    });
});
//# sourceMappingURL=contradictions.test.js.map