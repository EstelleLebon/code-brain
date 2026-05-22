import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ModeSelector } from '../cognitive-modes/ModeSelector.js';
import { CognitiveMode } from '../cognitive-modes/CognitiveMode.js';
import { getStrategy, STRATEGIES } from '../cognitive-modes/ExecutionStrategy.js';

describe('ModeSelector', () => {
  const selector = new ModeSelector();

  test('hotfix always selects HOTFIX', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 0,
      recentSuccesses: 10,
      runtimeInstability: false,
      retrievalConfidence: 0.9,
      isHotfix: true,
    });
    assert.equal(mode, CognitiveMode.HOTFIX);
  });

  test('selects RECOVERY with 3+ failures', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 3,
      recentSuccesses: 0,
      runtimeInstability: false,
      retrievalConfidence: 0.5,
      isHotfix: false,
    });
    assert.equal(mode, CognitiveMode.RECOVERY);
  });

  test('selects RECOVERY with runtime instability + 1 failure', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 1,
      recentSuccesses: 0,
      runtimeInstability: true,
      retrievalConfidence: 0.5,
      isHotfix: false,
    });
    assert.equal(mode, CognitiveMode.RECOVERY);
  });

  test('selects LEARNING when trend is degrading', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 0,
      recentSuccesses: 2,
      runtimeInstability: false,
      retrievalConfidence: 0.6,
      isHotfix: false,
      learningSignal: {
        totalObservations: 10,
        successCount: 4,
        failureCount: 6,
        successRate: 0.4,
        dominantSignal: 'failure',
        recentTrend: 'degrading',
        operationTypeStats: new Map(),
      },
    });
    assert.equal(mode, CognitiveMode.LEARNING);
  });

  test('selects SAFE_REFACTOR for high risk', () => {
    const mode = selector.select({
      calibratedRisk: 'high',
      recentFailures: 0,
      recentSuccesses: 2,
      runtimeInstability: false,
      retrievalConfidence: 0.8,
      isHotfix: false,
    });
    assert.equal(mode, CognitiveMode.SAFE_REFACTOR);
  });

  test('selects AGGRESSIVE_OPTIMIZATION in stable zone', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 0,
      recentSuccesses: 5,
      runtimeInstability: false,
      retrievalConfidence: 0.8,
      isHotfix: false,
    });
    assert.equal(mode, CognitiveMode.AGGRESSIVE_OPTIMIZATION);
  });

  test('selects EXPLORATION with low retrieval confidence', () => {
    const mode = selector.select({
      calibratedRisk: 'low',
      recentFailures: 0,
      recentSuccesses: 2,
      runtimeInstability: false,
      retrievalConfidence: 0.2,
      isHotfix: false,
    });
    assert.equal(mode, CognitiveMode.EXPLORATION);
  });

  test('selectWithStrategy returns mode and matching strategy', () => {
    const { mode, strategy } = selector.selectWithStrategy({
      calibratedRisk: 'low',
      recentFailures: 0,
      recentSuccesses: 0,
      runtimeInstability: false,
      retrievalConfidence: 0.5,
      isHotfix: false,
    });
    assert.equal(strategy.mode, mode);
  });
});

describe('ExecutionStrategy', () => {
  test('all modes have defined strategies', () => {
    for (const mode of Object.values(CognitiveMode)) {
      const strategy = getStrategy(mode);
      assert.ok(strategy, `Missing strategy for ${mode}`);
      assert.equal(strategy.mode, mode);
      assert.ok(strategy.maxMutations > 0);
    }
  });

  test('RECOVERY is the most restrictive mode', () => {
    const recovery = STRATEGIES[CognitiveMode.RECOVERY];
    assert.equal(recovery.maxMutations, 1);
    assert.equal(recovery.rollbackAggressiveness, 'immediate');
    assert.equal(recovery.retrievalStrictness, 'strict');
    assert.equal(recovery.validationDepth, 'full');
  });

  test('AGGRESSIVE_OPTIMIZATION allows highest mutation count', () => {
    const agg = STRATEGIES[CognitiveMode.AGGRESSIVE_OPTIMIZATION];
    const allMaxMutations = Object.values(STRATEGIES).map(s => s.maxMutations);
    assert.equal(agg.maxMutations, Math.max(...allMaxMutations));
  });
});
