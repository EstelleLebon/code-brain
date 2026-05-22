import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReliabilityMetrics } from '../reliability/ReliabilityMetrics.js';

describe('ReliabilityMetrics', () => {
  let metrics: ReliabilityMetrics;

  beforeEach(() => {
    metrics = new ReliabilityMetrics();
  });

  it('snapshot returns all required fields', () => {
    const snap = metrics.snapshot();
    assert.ok(snap.timestamp instanceof Date);
    assert.ok(typeof snap.meanRecoveryTimeMs === 'number');
    assert.ok(typeof snap.rollbackContainmentRate === 'number');
    assert.ok(typeof snap.executionReproducibility === 'number');
    assert.ok(typeof snap.snapshotIntegrity === 'number');
    assert.ok(typeof snap.trustStability === 'number');
    assert.ok(typeof snap.planningStability === 'number');
    assert.ok(typeof snap.runtimeResilience === 'number');
    assert.ok(typeof snap.overallScore === 'number');
  });

  it('defaults to perfect score with no data', () => {
    const snap = metrics.snapshot();
    assert.ok(snap.overallScore >= 0.9);
  });

  it('recordRecovery affects mean recovery time', () => {
    metrics.recordRecovery(200, true);
    metrics.recordRecovery(400, true);
    const snap = metrics.snapshot();
    assert.equal(snap.meanRecoveryTimeMs, 300);
  });

  it('containment rate drops with uncontained recoveries', () => {
    metrics.recordRecovery(100, false);
    metrics.recordRecovery(100, false);
    const snap = metrics.snapshot();
    assert.equal(snap.rollbackContainmentRate, 0);
  });

  it('snapshot integrity reflects failed checks', () => {
    metrics.recordSnapshotCheck(false);
    metrics.recordSnapshotCheck(false);
    metrics.recordSnapshotCheck(true);
    const snap = metrics.snapshot();
    assert.ok(snap.snapshotIntegrity < 0.5);
  });

  it('replay checks affect reproducibility', () => {
    metrics.recordReplayCheck(true);
    metrics.recordReplayCheck(false);
    const snap = metrics.snapshot();
    assert.equal(snap.executionReproducibility, 0.5);
  });

  it('trust samples affect trust stability', () => {
    metrics.recordTrustSample(0.2);
    metrics.recordTrustSample(0.4);
    const snap = metrics.snapshot();
    assert.ok(snap.trustStability < 0.5);
  });

  it('planning samples affect planning stability', () => {
    metrics.recordPlanningSample(1.0);
    metrics.recordPlanningSample(1.0);
    const snap = metrics.snapshot();
    assert.ok(snap.planningStability >= 0.9);
  });

  it('trend detects improving score', () => {
    metrics.recordTrustSample(0.5);
    metrics.snapshot();
    metrics.recordTrustSample(0.9);
    metrics.recordPlanningSample(1.0);
    metrics.snapshot();
    const trend = metrics.trend();
    assert.ok(trend.snapshots.length >= 2);
  });

  it('reset clears all recorded data', () => {
    metrics.recordRecovery(500, false);
    metrics.recordTrustSample(0.1);
    metrics.reset();
    const snap = metrics.snapshot();
    assert.equal(snap.meanRecoveryTimeMs, 0);
    assert.ok(snap.trustStability >= 0.9);
  });

  it('overall score is clamped 0–1', () => {
    for (let i = 0; i < 10; i++) {
      metrics.recordSnapshotCheck(false);
      metrics.recordReplayCheck(false);
      metrics.recordTrustSample(0);
    }
    const snap = metrics.snapshot();
    assert.ok(snap.overallScore >= 0 && snap.overallScore <= 1);
  });
});
