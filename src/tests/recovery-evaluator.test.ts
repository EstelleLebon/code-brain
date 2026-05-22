import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryEvaluator } from '../reliability/RecoveryEvaluator.js';

describe('RecoveryEvaluator', () => {
  let evaluator: RecoveryEvaluator;

  beforeEach(() => {
    evaluator = new RecoveryEvaluator();
  });

  it('evaluates an excellent recovery', () => {
    const outcome = evaluator.evaluate({
      executionId: 'e1',
      rollbackDepth: 0,
      recoveryDurationMs: 50,
      collateralSteps: 0,
      repeatedFailures: 0,
      eventualSuccess: true,
    });
    assert.equal(outcome.quality, 'excellent');
    assert.ok(outcome.score >= 0.8);
  });

  it('evaluates a catastrophic recovery', () => {
    const outcome = evaluator.evaluate({
      executionId: 'e2',
      rollbackDepth: 10,
      recoveryDurationMs: 8000,
      collateralSteps: 8,
      repeatedFailures: 5,
      eventualSuccess: false,
    });
    assert.equal(outcome.quality, 'catastrophic');
    assert.ok(outcome.score < 0.2);
  });

  it('eventualSuccess=false reduces score significantly', () => {
    const success = evaluator.evaluate({
      executionId: 'e3',
      rollbackDepth: 1,
      recoveryDurationMs: 100,
      collateralSteps: 0,
      repeatedFailures: 0,
      eventualSuccess: true,
    });
    const failure = evaluator.evaluate({
      executionId: 'e4',
      rollbackDepth: 1,
      recoveryDurationMs: 100,
      collateralSteps: 0,
      repeatedFailures: 0,
      eventualSuccess: false,
    });
    assert.ok(success.score > failure.score);
  });

  it('summary returns all outcomes', () => {
    evaluator.evaluate({
      executionId: 'a', rollbackDepth: 0, recoveryDurationMs: 100,
      collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
    });
    evaluator.evaluate({
      executionId: 'b', rollbackDepth: 5, recoveryDurationMs: 3000,
      collateralSteps: 3, repeatedFailures: 2, eventualSuccess: false,
    });
    const summary = evaluator.summary();
    assert.equal(summary.outcomes.length, 2);
    assert.ok(summary.worstCase);
    assert.ok(summary.bestCase);
    assert.ok(summary.bestCase!.score >= summary.worstCase!.score);
  });

  it('quality distribution counts correctly', () => {
    evaluator.evaluate({
      executionId: 'x', rollbackDepth: 0, recoveryDurationMs: 50,
      collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
    });
    const summary = evaluator.summary();
    assert.equal(summary.qualityDistribution.excellent, 1);
  });

  it('meanScore is average of all scores', () => {
    const a = evaluator.evaluate({
      executionId: 'a', rollbackDepth: 0, recoveryDurationMs: 50,
      collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
    });
    const b = evaluator.evaluate({
      executionId: 'b', rollbackDepth: 10, recoveryDurationMs: 9000,
      collateralSteps: 5, repeatedFailures: 3, eventualSuccess: false,
    });
    const summary = evaluator.summary();
    const expected = (a.score + b.score) / 2;
    assert.ok(Math.abs(summary.meanScore - expected) < 0.001);
  });

  it('reset clears all outcomes', () => {
    evaluator.evaluate({
      executionId: 'z', rollbackDepth: 0, recoveryDurationMs: 10,
      collateralSteps: 0, repeatedFailures: 0, eventualSuccess: true,
    });
    evaluator.reset();
    const summary = evaluator.summary();
    assert.equal(summary.outcomes.length, 0);
    assert.equal(summary.meanScore, 1);
  });

  it('poor quality classification', () => {
    const outcome = evaluator.evaluate({
      executionId: 'p', rollbackDepth: 4,
      recoveryDurationMs: 4000,
      collateralSteps: 3,
      repeatedFailures: 1,
      eventualSuccess: false,
    });
    assert.ok(['poor', 'catastrophic'].includes(outcome.quality));
  });
});
