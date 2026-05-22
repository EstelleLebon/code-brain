import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CognitiveFeedbackLoop } from '../cognitive-loop/CognitiveFeedbackLoop.js';
import { AdaptiveRetrievalPolicy } from '../cognitive-loop/AdaptiveRetrievalPolicy.js';
import { LearningSignalAggregator } from '../cognitive-loop/LearningSignalAggregator.js';
import type { LearningResult } from '../learning/RuntimeLearningEngine.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';

function makeSuccessResult(): LearningResult {
  return { outcome: 'success', successPatternId: 'p1' };
}

function makeFailureResult(): LearningResult {
  return { outcome: 'failure_learned' };
}

function makeOutcome(status: 'success' | 'failure' = 'success'): ExecutionOutcome {
  return {
    id: `out-${Date.now()}`,
    operationId: 'op1',
    outcome: status,
    signals: [],
    riskObserved: 20,
    summary: [],
    timestamp: Date.now(),
  };
}

describe('CognitiveFeedbackLoop', () => {
  test('starts with 0 iterations', () => {
    const loop = new CognitiveFeedbackLoop();
    const summary = loop.summary();
    assert.equal(summary.loopIterations, 0);
  });

  test('observe increments iterations', () => {
    const loop = new CognitiveFeedbackLoop();
    loop.observe(makeSuccessResult(), makeOutcome());
    loop.observe(makeSuccessResult(), makeOutcome());
    assert.equal(loop.summary().loopIterations, 2);
  });

  test('3 failures → adaptive trust tightens', () => {
    const loop = new CognitiveFeedbackLoop();
    loop.observe(makeFailureResult(), makeOutcome('failure'));
    loop.observe(makeFailureResult(), makeOutcome('failure'));
    loop.observe(makeFailureResult(), makeOutcome('failure'));
    const state = loop.adaptiveTrust.getState();
    assert.equal(state.calibratedRiskDelta, -1);
  });

  test('5 successes → adaptive trust loosens', () => {
    const loop = new CognitiveFeedbackLoop();
    for (let i = 0; i < 5; i++) loop.observe(makeSuccessResult(), makeOutcome());
    const state = loop.adaptiveTrust.getState();
    assert.equal(state.calibratedRiskDelta, 1);
  });

  test('currentTrustPolicy reflects adaptation', () => {
    const loop = new CognitiveFeedbackLoop();
    for (let i = 0; i < 5; i++) loop.observe(makeSuccessResult(), makeOutcome());
    const policy = loop.currentTrustPolicy();
    // default maxAutoApproveRisk=low shifted up → medium
    assert.equal(policy.maxAutoApproveRisk, 'medium');
  });

  test('observe records chunk reliability for affected chunks', () => {
    const loop = new CognitiveFeedbackLoop();
    loop.observe(makeSuccessResult(), makeOutcome(), ['chunk-1', 'chunk-2']);
    const signal = loop.adaptiveRetrieval.getSignal('chunk-1');
    assert.ok(signal.successRate > 0.5);
  });

  test('failure reduces chunk reliability', () => {
    const loop = new CognitiveFeedbackLoop();
    loop.observe(makeFailureResult(), makeOutcome('failure'), ['bad-chunk']);
    const signal = loop.adaptiveRetrieval.getSignal('bad-chunk');
    assert.ok(signal.failureRate > 0.5);
  });

  test('aggregated signal reflects success count', () => {
    const loop = new CognitiveFeedbackLoop();
    loop.observe(makeSuccessResult(), makeOutcome());
    loop.observe(makeSuccessResult(), makeOutcome());
    loop.observe(makeFailureResult(), makeOutcome('failure'));
    const agg = loop.summary().aggregatedSignal;
    assert.equal(agg.successCount, 2);
    assert.equal(agg.failureCount, 1);
  });
});

describe('AdaptiveRetrievalPolicy', () => {
  test('unknown chunk returns 0.5 rates', () => {
    const policy = new AdaptiveRetrievalPolicy();
    const s = policy.getSignal('unknown');
    assert.equal(s.successRate, 0.5);
    assert.equal(s.failureRate, 0.5);
  });

  test('pure successes builds confidence', () => {
    const policy = new AdaptiveRetrievalPolicy();
    for (let i = 0; i < 10; i++) policy.recordSuccess('c1');
    const s = policy.getSignal('c1');
    assert.equal(s.successRate, 1);
    assert.equal(s.failureRate, 0);
    assert.ok(s.runtimeConfidence > 0.8);
  });

  test('rankByReliability sorts best first', () => {
    const policy = new AdaptiveRetrievalPolicy();
    for (let i = 0; i < 5; i++) policy.recordSuccess('good');
    for (let i = 0; i < 5; i++) policy.recordFailure('bad');
    const ranked = policy.rankByReliability(['bad', 'good']);
    assert.equal(ranked[0], 'good');
  });
});

describe('LearningSignalAggregator', () => {
  test('starts empty', () => {
    const agg = new LearningSignalAggregator();
    const sig = agg.aggregate();
    assert.equal(sig.totalObservations, 0);
    assert.equal(sig.successRate, 0.5);
  });

  test('dominantSignal reflects success majority', () => {
    const agg = new LearningSignalAggregator();
    for (let i = 0; i < 7; i++) agg.ingest(makeSuccessResult(), makeOutcome());
    for (let i = 0; i < 3; i++) agg.ingest(makeFailureResult(), makeOutcome('failure'));
    assert.equal(agg.aggregate().dominantSignal, 'success');
  });

  test('recentTrend detects improvement', () => {
    const agg = new LearningSignalAggregator();
    // early: all failures
    for (let i = 0; i < 5; i++) agg.ingest(makeFailureResult(), makeOutcome('failure'));
    // late: all successes
    for (let i = 0; i < 5; i++) agg.ingest(makeSuccessResult(), makeOutcome());
    assert.equal(agg.aggregate().recentTrend, 'improving');
  });

  test('recentTrend detects degradation', () => {
    const agg = new LearningSignalAggregator();
    for (let i = 0; i < 5; i++) agg.ingest(makeSuccessResult(), makeOutcome());
    for (let i = 0; i < 5; i++) agg.ingest(makeFailureResult(), makeOutcome('failure'));
    assert.equal(agg.aggregate().recentTrend, 'degrading');
  });

  test('clear resets aggregator', () => {
    const agg = new LearningSignalAggregator();
    agg.ingest(makeSuccessResult(), makeOutcome());
    agg.clear();
    assert.equal(agg.aggregate().totalObservations, 0);
  });
});
