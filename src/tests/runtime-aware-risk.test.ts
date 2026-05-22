import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeAwareRiskAssessor } from '../risk/RuntimeAwareRiskAssessor.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';
import { SemanticOperation } from '../semantic-ir/types.js';

function makeOp(type: SemanticOperation['operationType']): SemanticOperation {
  return {
    id: 'op-1',
    operationType: type,
    targetSymbols: ['Foo'],
    constraints: [],
    expectedEffects: [],
    createdAt: Date.now(),
  };
}

describe('RuntimeAwareRiskAssessor', () => {
  it('base case: score matches base engine', () => {
    const assessor = new RuntimeAwareRiskAssessor();
    const result = assessor.assess(makeOp('rename_symbol'));
    assert.ok(result.score >= 10);
    assert.ok(result.calibratedScore >= 0);
  });

  it('runtime instability increases score', () => {
    const assessor = new RuntimeAwareRiskAssessor();
    const base = assessor.assess(makeOp('rename_symbol'));
    const boosted = assessor.assess(makeOp('rename_symbol'), { runtimeInstabilityScore: 50 });
    assert.ok(boosted.score > base.score);
  });

  it('failure pattern match boosts score', () => {
    const mem = new FailureMemory();
    mem.record('move_function', ['x'], ['tests failed'], 8);
    const assessor = new RuntimeAwareRiskAssessor(mem);
    const result = assessor.assess(makeOp('move_function'), { structuralContext: ['x'] });
    assert.ok(result.failurePatternMatch);
    assert.ok(result.failurePatternIds.length > 0);
  });

  it('calibration adjusts predicted score', () => {
    const assessor = new RuntimeAwareRiskAssessor();
    assessor.calibration.observe('rename_symbol', 10, 30);
    const result = assessor.assess(makeOp('rename_symbol'));
    assert.ok(result.calibratedScore > result.score);
  });
});
