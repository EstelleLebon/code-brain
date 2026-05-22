"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RiskAssessmentEngine_js_1 = require("../risk/RiskAssessmentEngine.js");
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
const ir = new SemanticIR_js_1.SemanticIR();
const risk = new RiskAssessmentEngine_js_1.RiskAssessmentEngine();
(0, node_test_1.describe)('RiskAssessmentEngine', () => {
    (0, node_test_1.it)('rename_symbol has low base risk', () => {
        const op = ir.createOperation('rename_symbol', ['foo']);
        const a = risk.assess(op);
        strict_1.default.equal(a.level, 'low');
        strict_1.default.ok(a.score < 25);
    });
    (0, node_test_1.it)('split_module has high base risk', () => {
        const op = ir.createOperation('split_module', ['LargeModule']);
        const a = risk.assess(op);
        strict_1.default.ok(a.score >= 50, `expected score ≥ 50, got ${a.score}`);
    });
    (0, node_test_1.it)('many affected files increases risk', () => {
        const op = ir.createOperation('move_function', ['validate']);
        const a = risk.assess(op, { affectedFileCount: 10 });
        const baseline = risk.assess(op);
        strict_1.default.ok(a.score > baseline.score);
    });
    (0, node_test_1.it)('assessMany adds combined score', () => {
        const ops = [
            ir.createOperation('rename_symbol', ['a']),
            ir.createOperation('rename_symbol', ['b']),
            ir.createOperation('rename_symbol', ['c']),
        ];
        const a = risk.assessMany(ops);
        const single = risk.assess(ops[0]);
        strict_1.default.ok(a.score >= single.score);
    });
});
(0, node_test_1.describe)('TrustEvaluator', () => {
    (0, node_test_1.it)('auto-approves low risk', () => {
        const evaluator = new TrustPolicy_js_1.TrustEvaluator(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        const d = evaluator.evaluate('low', []);
        strict_1.default.equal(d.approved, true);
        strict_1.default.equal(d.approvalMode, 'auto');
    });
    (0, node_test_1.it)('requires review for high risk', () => {
        const evaluator = new TrustPolicy_js_1.TrustEvaluator(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        const d = evaluator.evaluate('high', ['large blast radius']);
        strict_1.default.equal(d.approved, false);
        strict_1.default.equal(d.requiresHumanReview, true);
        strict_1.default.equal(d.approvalMode, 'review');
    });
    (0, node_test_1.it)('manual only for critical risk', () => {
        const evaluator = new TrustPolicy_js_1.TrustEvaluator(TrustPolicy_js_1.DEFAULT_TRUST_POLICY);
        const d = evaluator.evaluate('critical', ['architecture rewrite']);
        strict_1.default.equal(d.approvalMode, 'manual');
    });
    (0, node_test_1.it)('conservative policy blocks medium risk', () => {
        const evaluator = new TrustPolicy_js_1.TrustEvaluator(TrustPolicy_js_1.CONSERVATIVE_TRUST_POLICY);
        const d = evaluator.evaluate('medium', []);
        strict_1.default.equal(d.approved, false);
        strict_1.default.equal(d.approvalMode, 'review');
    });
});
//# sourceMappingURL=risk-trust.test.js.map