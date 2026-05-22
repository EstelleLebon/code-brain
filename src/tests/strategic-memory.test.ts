import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StrategyMemory } from '../strategic-memory/StrategyMemory.js';
import { PlanningHeuristics } from '../strategic-memory/PlanningHeuristics.js';

function makeRecord(goalType: import('../goals/Goal.js').GoalType, success: boolean, rollbackCount = 0) {
  return {
    goalType,
    cognitiveMode: 'exploratory',
    success,
    executionTimeMs: 1000,
    stepsCount: 5,
    rollbackCount,
    timestamp: new Date(),
  };
}

describe('StrategyMemory', () => {
  test('recordStrategy and retrieve bestStrategies', () => {
    const mem = new StrategyMemory();
    mem.recordStrategy(makeRecord('refactor', true));
    mem.recordStrategy(makeRecord('refactor', false));
    const best = mem.bestStrategies('refactor');
    assert.equal(best.length, 1);
    assert.equal(best[0].success, true);
  });

  test('failurePatterns returns only failures', () => {
    const mem = new StrategyMemory();
    mem.recordStrategy(makeRecord('repair', true));
    mem.recordStrategy(makeRecord('repair', false));
    mem.recordStrategy(makeRecord('repair', false));
    const failures = mem.failurePatterns('repair');
    assert.equal(failures.length, 2);
  });

  test('averageSuccessRate calculates correctly', () => {
    const mem = new StrategyMemory();
    mem.recordStrategy(makeRecord('cleanup', true));
    mem.recordStrategy(makeRecord('cleanup', true));
    mem.recordStrategy(makeRecord('cleanup', false));
    const rate = mem.averageSuccessRate('cleanup');
    assert.ok(Math.abs(rate - 2 / 3) < 0.001);
  });

  test('averageSuccessRate returns 0 for unknown type', () => {
    const mem = new StrategyMemory();
    assert.equal(mem.averageSuccessRate('optimize'), 0);
  });
});

describe('PlanningHeuristics', () => {
  test('preferSmallPlans is true when failure rate high', () => {
    const mem = new StrategyMemory();
    for (let i = 0; i < 3; i++) mem.recordStrategy(makeRecord('refactor', false));
    const h = new PlanningHeuristics(mem);
    assert.equal(h.preferSmallPlans('refactor'), true);
  });

  test('preferSmallPlans is false when mostly successful', () => {
    const mem = new StrategyMemory();
    for (let i = 0; i < 5; i++) mem.recordStrategy(makeRecord('cleanup', true));
    const h = new PlanningHeuristics(mem);
    assert.equal(h.preferSmallPlans('cleanup'), false);
  });

  test('preferParallelism is true for stable history', () => {
    const mem = new StrategyMemory();
    for (let i = 0; i < 5; i++) mem.recordStrategy(makeRecord('refactor', true, 0));
    const h = new PlanningHeuristics(mem);
    assert.equal(h.preferParallelism('refactor'), true);
  });

  test('isDangerousPattern detects repeated mode failures', () => {
    const mem = new StrategyMemory();
    mem.recordStrategy({ ...makeRecord('repair', false), cognitiveMode: 'surgical' });
    mem.recordStrategy({ ...makeRecord('repair', false), cognitiveMode: 'surgical' });
    const h = new PlanningHeuristics(mem);
    assert.equal(h.isDangerousPattern('repair', 'surgical'), true);
  });

  test('shouldReduceMutations when high rollback average', () => {
    const mem = new StrategyMemory();
    mem.recordStrategy(makeRecord('migrate', false, 5));
    mem.recordStrategy(makeRecord('migrate', false, 4));
    const h = new PlanningHeuristics(mem);
    assert.equal(h.shouldReduceMutations('migrate'), true);
  });
});
