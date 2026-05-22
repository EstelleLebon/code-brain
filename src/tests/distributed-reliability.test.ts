import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedReliabilityMetrics } from '../distributed-reliability/DistributedReliabilityMetrics.js';

describe('DistributedReliabilityMetrics', () => {
  it('snapshot returns score of 1 with no data', () => {
    const m = new DistributedReliabilityMetrics();
    const snap = m.snapshot();
    assert.equal(snap.overallScore, 1);
  });

  it('recordConsensusAttempt affects consensusStability', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordConsensusAttempt(true);
    m.recordConsensusAttempt(false);
    const snap = m.snapshot();
    assert.equal(snap.consensusStability, 0.5);
  });

  it('recordReplication affects replicationIntegrity', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordReplication(true);
    m.recordReplication(true);
    m.recordReplication(false);
    const snap = m.snapshot();
    assert.ok(Math.abs(snap.replicationIntegrity - 2/3) < 0.01);
  });

  it('recordRecovery affects crossNodeRecoveryRate', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordRecovery(true);
    m.recordRecovery(false);
    const snap = m.snapshot();
    assert.equal(snap.crossNodeRecoveryRate, 0.5);
  });

  it('recordPartitionEvent affects partitionTolerance', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordPartitionEvent(true);
    m.recordPartitionEvent(false);
    const snap = m.snapshot();
    assert.equal(snap.partitionTolerance, 0.5);
  });

  it('recordCoordinationOverhead affects coordinationOverhead', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordCoordinationOverhead(50); // 50% of 100
    const snap = m.snapshot();
    assert.equal(snap.coordinationOverhead, 0.5);
  });

  it('recordReplayConsistency affects distributedReplayConsistency', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordReplayConsistency(true);
    m.recordReplayConsistency(false);
    const snap = m.snapshot();
    assert.equal(snap.distributedReplayConsistency, 0.5);
  });

  it('overallScore is average of all dimensions', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordConsensusAttempt(true);
    m.recordReplication(true);
    m.recordRecovery(true);
    m.recordPartitionEvent(true);
    m.recordReplayConsistency(true);
    const snap = m.snapshot();
    assert.ok(snap.overallScore > 0.9);
  });

  it('getHistory accumulates snapshots', () => {
    const m = new DistributedReliabilityMetrics();
    m.snapshot();
    m.snapshot();
    assert.equal(m.getHistory().length, 2);
  });

  it('getLatest returns most recent snapshot', () => {
    const m = new DistributedReliabilityMetrics();
    m.snapshot();
    const snap = m.snapshot();
    assert.equal(m.getLatest()?.timestamp, snap.timestamp);
  });

  it('coordinationOverhead capped at 1', () => {
    const m = new DistributedReliabilityMetrics();
    m.recordCoordinationOverhead(0); // 0 overhead = 1.0
    const snap = m.snapshot();
    assert.equal(snap.coordinationOverhead, 1);
  });
});
