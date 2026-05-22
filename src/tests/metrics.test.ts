import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CognitiveMetrics } from '../metrics/CognitiveMetrics.js';
import { RuntimeHealthMetrics } from '../metrics/RuntimeHealthMetrics.js';
import { MetricsAggregator } from '../metrics/MetricsAggregator.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

function makeSignal(type: RuntimeSignal['signalType'], status: RuntimeSignal['status']): RuntimeSignal {
  return { id: `s-${Math.random()}`, signalType: type, status, source: 'test', timestamp: Date.now() };
}

function goodObs() {
  return { success: true, hadRollback: false, retrievalHits: 8, retrievalTotal: 10, hadContradiction: false, runtimePassed: true, calibrationDelta: 0.05 };
}

function badObs() {
  return { success: false, hadRollback: true, retrievalHits: 2, retrievalTotal: 10, hadContradiction: true, runtimePassed: false, calibrationDelta: 0.4 };
}

describe('CognitiveMetrics', () => {
  test('empty metrics returns neutral snapshot', () => {
    const m = new CognitiveMetrics();
    const snap = m.snapshot();
    assert.equal(snap.retrievalPrecision, 0.5);
    assert.equal(snap.contradictionRate, 0);
    assert.equal(snap.rollbackFrequency, 0);
    assert.equal(snap.runtimeStability, 1);
  });

  test('records observations and computes rates', () => {
    const m = new CognitiveMetrics();
    m.record(goodObs());
    m.record(goodObs());
    m.record(badObs());
    const snap = m.snapshot();
    assert.ok(snap.runtimeStability > 0 && snap.runtimeStability < 1);
    assert.ok(snap.retrievalPrecision > 0.5); // 2 good, 1 bad
  });

  test('rollback frequency matches bad observations', () => {
    const m = new CognitiveMetrics();
    m.record(goodObs());
    m.record(badObs());
    const snap = m.snapshot();
    assert.ok(Math.abs(snap.rollbackFrequency - 0.5) < 0.01);
  });

  test('contradiction rate computed correctly', () => {
    const m = new CognitiveMetrics();
    m.record(goodObs());
    m.record(badObs());
    const snap = m.snapshot();
    assert.ok(Math.abs(snap.contradictionRate - 0.5) < 0.01);
  });

  test('health snapshot returns values in [0,1]', () => {
    const m = new CognitiveMetrics();
    m.record(goodObs());
    const h = m.healthSnapshot();
    for (const [key, val] of Object.entries(h)) {
      assert.ok(val >= 0 && val <= 1, `${key}=${val} out of range`);
    }
  });

  test('windowSize evicts old observations', () => {
    const m = new CognitiveMetrics(3);
    m.record(badObs());
    m.record(badObs());
    m.record(badObs());
    m.record(goodObs()); // evicts first bad
    m.record(goodObs()); // evicts second bad
    m.record(goodObs()); // evicts third bad
    const snap = m.snapshot();
    assert.equal(snap.rollbackFrequency, 0);
  });
});

describe('RuntimeHealthMetrics', () => {
  test('empty → overallHealth 1', () => {
    const m = new RuntimeHealthMetrics();
    assert.equal(m.report().overallHealth, 1);
  });

  test('all pass → overallHealth 1', () => {
    const m = new RuntimeHealthMetrics();
    m.ingest(makeSignal('test', 'success'));
    m.ingest(makeSignal('build', 'success'));
    assert.equal(m.report().overallHealth, 1);
  });

  test('all fail → overallHealth 0', () => {
    const m = new RuntimeHealthMetrics();
    m.ingest(makeSignal('test', 'failure'));
    m.ingest(makeSignal('build', 'failure'));
    assert.equal(m.report().overallHealth, 0);
  });

  test('byType tracks per-signal-type stats', () => {
    const m = new RuntimeHealthMetrics();
    m.ingest(makeSignal('test', 'success'));
    m.ingest(makeSignal('test', 'failure'));
    m.ingest(makeSignal('build', 'success'));
    const r = m.report();
    const testStats = r.byType.get('test')!;
    assert.equal(testStats.pass, 1);
    assert.equal(testStats.fail, 1);
  });

  test('warning counts as 0.5 health', () => {
    const m = new RuntimeHealthMetrics();
    m.ingest(makeSignal('lint', 'warning'));
    m.ingest(makeSignal('lint', 'warning'));
    const r = m.report();
    assert.ok(Math.abs(r.overallHealth - 0.5) < 0.01);
  });
});

describe('MetricsAggregator', () => {
  test('recordExecution feeds both cognitive and runtime', () => {
    const agg = new MetricsAggregator();
    const signals = [makeSignal('test', 'success'), makeSignal('build', 'failure')];
    agg.recordExecution({ ...goodObs(), signals });
    const runtimeReport = agg.runtime.report();
    assert.equal(runtimeReport.totalSignals, 2);
  });

  test('overallStabilityScore is in [0,1]', () => {
    const agg = new MetricsAggregator();
    agg.recordExecution({ ...goodObs() });
    const score = agg.overallStabilityScore();
    assert.ok(score >= 0 && score <= 1);
  });

  test('cognitiveHealth returns proper snapshot', () => {
    const agg = new MetricsAggregator();
    agg.recordExecution({ ...goodObs() });
    const h = agg.cognitiveHealth(0.8, 0.9);
    assert.ok(h.trustHealth > 0);
  });
});
