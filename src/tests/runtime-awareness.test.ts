import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeSignalCollector } from '../runtime-awareness/RuntimeSignalCollector.js';
import { RuntimeSignalAggregator } from '../runtime-awareness/RuntimeSignalAggregator.js';
import { createSnapshot } from '../runtime-awareness/RuntimeSignal.js';

describe('RuntimeSignalCollector', () => {
  it('creates a signal with correct type and status', () => {
    const col = new RuntimeSignalCollector({ source: 'test' });
    const sig = col.collect('test', 'success', { suite: 'unit' }, 42);
    assert.equal(sig.signalType, 'test');
    assert.equal(sig.status, 'success');
    assert.equal(sig.durationMs, 42);
    assert.equal(sig.source, 'test');
  });

  it('fromExitCode: exit 0 → success, exit 1 → failure', () => {
    const col = new RuntimeSignalCollector({ source: 'ci' });
    assert.equal(col.fromExitCode('build', 0).status, 'success');
    assert.equal(col.fromExitCode('build', 1).status, 'failure');
    assert.equal(col.fromExitCode('build', 2).status, 'warning');
  });
});

describe('RuntimeSignalAggregator', () => {
  it('overall status is failure when any signal fails', () => {
    const agg = new RuntimeSignalAggregator();
    const col = new RuntimeSignalCollector({ source: 'x' });
    agg.add(col.collect('test', 'success'));
    agg.add(col.collect('build', 'failure'));
    const result = agg.aggregate();
    assert.equal(result.overallStatus, 'failure');
    assert.equal(result.hasFailures, true);
  });

  it('overall status is success when all pass', () => {
    const agg = new RuntimeSignalAggregator();
    const col = new RuntimeSignalCollector({ source: 'x' });
    agg.add(col.collect('test', 'success'));
    agg.add(col.collect('typecheck', 'success'));
    assert.equal(agg.aggregate().overallStatus, 'success');
  });

  it('forType filters correctly', () => {
    const agg = new RuntimeSignalAggregator();
    const col = new RuntimeSignalCollector({ source: 'x' });
    agg.add(col.collect('test', 'success'));
    agg.add(col.collect('lint', 'warning'));
    assert.equal(agg.forType('test').length, 1);
    assert.equal(agg.forType('lint').length, 1);
    assert.equal(agg.forType('build').length, 0);
  });
});

describe('createSnapshot', () => {
  it('produces correct summary counts', () => {
    const col = new RuntimeSignalCollector({ source: 'x' });
    const signals = [
      col.collect('test', 'success'),
      col.collect('build', 'failure'),
      col.collect('lint', 'warning'),
    ];
    const snap = createSnapshot('op-1', signals);
    assert.equal(snap.summary.total, 3);
    assert.equal(snap.summary.success, 1);
    assert.equal(snap.summary.failure, 1);
    assert.equal(snap.summary.warning, 1);
    assert.equal(snap.operationId, 'op-1');
  });
});
