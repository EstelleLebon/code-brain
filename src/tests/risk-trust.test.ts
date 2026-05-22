import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RiskAssessmentEngine } from '../risk/RiskAssessmentEngine.js';
import { TrustEvaluator, DEFAULT_TRUST_POLICY, CONSERVATIVE_TRUST_POLICY } from '../trust/TrustPolicy.js';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';

const ir = new SemanticIR();
const risk = new RiskAssessmentEngine();

describe('RiskAssessmentEngine', () => {
  it('rename_symbol has low base risk', () => {
    const op = ir.createOperation('rename_symbol', ['foo']);
    const a = risk.assess(op);
    assert.equal(a.level, 'low');
    assert.ok(a.score < 25);
  });

  it('split_module has high base risk', () => {
    const op = ir.createOperation('split_module', ['LargeModule']);
    const a = risk.assess(op);
    assert.ok(a.score >= 50, `expected score ≥ 50, got ${a.score}`);
  });

  it('many affected files increases risk', () => {
    const op = ir.createOperation('move_function', ['validate']);
    const a = risk.assess(op, { affectedFileCount: 10 });
    const baseline = risk.assess(op);
    assert.ok(a.score > baseline.score);
  });

  it('assessMany adds combined score', () => {
    const ops = [
      ir.createOperation('rename_symbol', ['a']),
      ir.createOperation('rename_symbol', ['b']),
      ir.createOperation('rename_symbol', ['c']),
    ];
    const a = risk.assessMany(ops);
    const single = risk.assess(ops[0]!);
    assert.ok(a.score >= single.score);
  });
});

describe('TrustEvaluator', () => {
  it('auto-approves low risk', () => {
    const evaluator = new TrustEvaluator(DEFAULT_TRUST_POLICY);
    const d = evaluator.evaluate('low', []);
    assert.equal(d.approved, true);
    assert.equal(d.approvalMode, 'auto');
  });

  it('requires review for high risk', () => {
    const evaluator = new TrustEvaluator(DEFAULT_TRUST_POLICY);
    const d = evaluator.evaluate('high', ['large blast radius']);
    assert.equal(d.approved, false);
    assert.equal(d.requiresHumanReview, true);
    assert.equal(d.approvalMode, 'review');
  });

  it('manual only for critical risk', () => {
    const evaluator = new TrustEvaluator(DEFAULT_TRUST_POLICY);
    const d = evaluator.evaluate('critical', ['architecture rewrite']);
    assert.equal(d.approvalMode, 'manual');
  });

  it('conservative policy blocks medium risk', () => {
    const evaluator = new TrustEvaluator(CONSERVATIVE_TRUST_POLICY);
    const d = evaluator.evaluate('medium', []);
    assert.equal(d.approved, false);
    assert.equal(d.approvalMode, 'review');
  });
});
