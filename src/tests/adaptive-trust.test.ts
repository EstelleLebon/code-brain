import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveTrustPolicy } from '../cognitive-loop/AdaptiveTrustPolicy.js';
import { DEFAULT_TRUST_POLICY, CONSERVATIVE_TRUST_POLICY } from '../trust/TrustPolicy.js';

describe('AdaptiveTrustPolicy', () => {
  test('starts with base policy unchanged', () => {
    const policy = new AdaptiveTrustPolicy(DEFAULT_TRUST_POLICY);
    const current = policy.currentPolicy();
    assert.equal(current.maxAutoApproveRisk, DEFAULT_TRUST_POLICY.maxAutoApproveRisk);
    assert.equal(current.maxReviewRisk, DEFAULT_TRUST_POLICY.maxReviewRisk);
  });

  test('initial state has confidence 0.5', () => {
    const policy = new AdaptiveTrustPolicy();
    const state = policy.getState();
    assert.equal(state.confidence, 0.5);
    assert.equal(state.recentFailures, 0);
    assert.equal(state.recentSuccesses, 0);
    assert.equal(state.calibratedRiskDelta, 0);
  });

  test('becomes conservative after 3+ failures', () => {
    const policy = new AdaptiveTrustPolicy(DEFAULT_TRUST_POLICY);
    policy.recordFailure();
    policy.recordFailure();
    policy.recordFailure();
    const state = policy.getState();
    assert.equal(state.calibratedRiskDelta, -1);
    assert.ok(state.confidence < 0.5);
  });

  test('conservative policy tightens auto-approve threshold', () => {
    const policy = new AdaptiveTrustPolicy(DEFAULT_TRUST_POLICY);
    // default: maxAutoApproveRisk = 'low' → after tightening should stay low or become critical (min idx)
    // 'low' is index 0, shifting down stays at 0
    policy.recordFailure();
    policy.recordFailure();
    policy.recordFailure();
    const current = policy.currentPolicy();
    // autoApproveRisk shifted down from 'low' (idx 0) stays 'low'
    assert.equal(current.maxAutoApproveRisk, 'low');
    // maxReviewRisk = 'high' (idx 2) shifts to 'medium' (idx 1)
    assert.equal(current.maxReviewRisk, 'medium');
  });

  test('becomes permissive after 5+ successes with no failures', () => {
    const policy = new AdaptiveTrustPolicy(DEFAULT_TRUST_POLICY);
    for (let i = 0; i < 5; i++) policy.recordSuccess();
    const state = policy.getState();
    assert.equal(state.calibratedRiskDelta, 1);
    assert.ok(state.confidence > 0.8);
  });

  test('permissive policy loosens thresholds', () => {
    const policy = new AdaptiveTrustPolicy(DEFAULT_TRUST_POLICY);
    for (let i = 0; i < 5; i++) policy.recordSuccess();
    const current = policy.currentPolicy();
    // 'low' → 'medium'
    assert.equal(current.maxAutoApproveRisk, 'medium');
    // 'high' → 'critical'
    assert.equal(current.maxReviewRisk, 'critical');
  });

  test('reset returns to initial state', () => {
    const policy = new AdaptiveTrustPolicy();
    policy.recordFailure();
    policy.recordFailure();
    policy.recordFailure();
    policy.reset();
    const state = policy.getState();
    assert.equal(state.confidence, 0.5);
    assert.equal(state.calibratedRiskDelta, 0);
  });

  test('conservative base policy stays conservative when tightened', () => {
    const policy = new AdaptiveTrustPolicy(CONSERVATIVE_TRUST_POLICY);
    policy.recordFailure();
    policy.recordFailure();
    policy.recordFailure();
    const current = policy.currentPolicy();
    assert.equal(current.name, 'conservative-adaptive');
  });

  test('mixed signals stay neutral', () => {
    const policy = new AdaptiveTrustPolicy();
    policy.recordSuccess();
    policy.recordFailure();
    policy.recordSuccess();
    const state = policy.getState();
    assert.equal(state.calibratedRiskDelta, 0);
  });
});
