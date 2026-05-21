import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ContradictionDetector } from '../contradictions/ContradictionDetector.js';
import { Claim, TruthLevel } from '../types/index.js';

function makeClaim(id: string, symbolId: string, claim: string): Claim {
  return {
    id,
    symbolId,
    claim,
    confidence: 1.0,
    sourceHash: 'abc123',
    truthLevel: TruthLevel.DERIVED,
  };
}

describe('ContradictionDetector', () => {
  test('detect() finds numeric contradiction for same symbol', () => {
    const detector = new ContradictionDetector();
    const claims: Claim[] = [
      makeClaim('c1', 'sym_001', 'Function has 3 parameters'),
      makeClaim('c2', 'sym_001', 'Function has 5 parameters'),
    ];
    const contradictions = detector.detect(claims);
    assert.ok(contradictions.length >= 1, 'Should detect at least one contradiction');
    assert.equal(contradictions[0]!.kind, 'claim_vs_claim');
  });

  test('detect() finds boolean contradiction (exported vs not exported)', () => {
    const detector = new ContradictionDetector();
    const claims: Claim[] = [
      makeClaim('c1', 'sym_002', 'Symbol is exported'),
      makeClaim('c2', 'sym_002', 'Symbol is not exported'),
    ];
    const contradictions = detector.detect(claims);
    assert.ok(contradictions.length >= 1, 'Should detect boolean contradiction');
  });

  test('detect() does NOT flag claims from different symbols', () => {
    const detector = new ContradictionDetector();
    const claims: Claim[] = [
      makeClaim('c1', 'sym_a', 'Function has 3 parameters'),
      makeClaim('c2', 'sym_b', 'Function has 5 parameters'),
    ];
    const contradictions = detector.detect(claims);
    assert.equal(contradictions.length, 0, 'Different symbols should not contradict');
  });

  test('detect() does NOT flag identical claims', () => {
    const detector = new ContradictionDetector();
    const claims: Claim[] = [
      makeClaim('c1', 'sym_z', 'Function has 3 parameters'),
      makeClaim('c2', 'sym_z', 'Function has 3 parameters'),
    ];
    const contradictions = detector.detect(claims);
    assert.equal(contradictions.length, 0, 'Identical claims should not be flagged');
  });

  test('report() aggregates correctly', () => {
    const detector = new ContradictionDetector();
    const claims: Claim[] = [
      makeClaim('c1', 'sym_001', 'Function has 2 parameters'),
      makeClaim('c2', 'sym_001', 'Function has 4 parameters'),
      makeClaim('c3', 'sym_002', 'Symbol is exported'),
      makeClaim('c4', 'sym_002', 'Symbol is not exported'),
    ];
    const contradictions = detector.detect(claims);
    const report = detector.report(contradictions);

    assert.ok(report.totalCount >= 2, 'Should report at least 2 contradictions');
    assert.equal(report.contradictions.length, report.totalCount);
    assert.ok(report.bySeverity['medium'] >= 0 || report.bySeverity['high'] >= 0);
    assert.ok(report.byKind['claim_vs_claim'] >= 2, 'All should be claim_vs_claim kind');
  });

  test('onDetected handler is called for each contradiction', () => {
    const detector = new ContradictionDetector();
    const detected: string[] = [];
    detector.onDetected(c => detected.push(c.id));

    const claims: Claim[] = [
      makeClaim('c1', 'sym_001', 'Function has 1 parameters'),
      makeClaim('c2', 'sym_001', 'Function has 9 parameters'),
    ];
    detector.detect(claims);

    assert.ok(detected.length >= 1, 'Handler should have been called');
  });
});
