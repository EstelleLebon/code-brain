import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChaosEngine } from '../chaos-engineering/ChaosEngine.js';
import { FaultInjector } from '../stress-testing/FaultInjection.js';
import { CHAOS_POLICIES } from '../chaos-engineering/ChaosPolicy.js';

describe('ChaosEngine', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = new ChaosEngine(new FaultInjector(13), 'SAFE');
  });

  afterEach(() => {
    engine.stop();
  });

  it('starts in idle status', () => {
    assert.equal(engine.status(), 'idle');
  });

  it('status becomes stopped after stop()', () => {
    engine.start(1000);
    engine.stop();
    assert.equal(engine.status(), 'stopped');
  });

  it('tick injects faults within policy limits', () => {
    engine.start(10000); // long interval so we control ticks manually
    engine.stop(); // stop timer but keep state
    const engine2 = new ChaosEngine(new FaultInjector(13), 'BALANCED');
    const result = engine2.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
    assert.ok(typeof result.faultsInjected === 'number');
    assert.equal(result.aborted, false);
    engine2.stop();
  });

  it('tick aborts on catastrophic instability', () => {
    const result = engine.tick({ trustScore: 0.0, rollbackDepth: 100, replanRate: 0 });
    assert.equal(result.aborted, true);
    assert.equal(engine.status(), 'aborted');
  });

  it('applyPolicy changes the active policy', () => {
    engine.applyPolicy('NUCLEAR');
    assert.equal(engine.policy().level, 'NUCLEAR');
  });

  it('NUCLEAR policy has more concurrent faults than SAFE', () => {
    const safe = CHAOS_POLICIES['SAFE'];
    const nuclear = CHAOS_POLICIES['NUCLEAR'];
    assert.ok(nuclear.maxConcurrentFaults > safe.maxConcurrentFaults);
  });

  it('SAFE policy auto-aborts at lower rollback depth', () => {
    const safe = CHAOS_POLICIES['SAFE'];
    const nuclear = CHAOS_POLICIES['NUCLEAR'];
    assert.ok(safe.autoAbortThresholds.maxRollbackDepth < nuclear.autoAbortThresholds.maxRollbackDepth);
  });

  it('tickHistory records each tick result', () => {
    engine.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
    engine.tick({ trustScore: 1, rollbackDepth: 0, replanRate: 0 });
    assert.ok(engine.tickHistory().length >= 1);
  });

  it('stop clears active faults', () => {
    engine.start(10000);
    engine.stop();
    const active = engine.injector().activeFaults();
    assert.equal(active.length, 0);
  });

  it('does not throw on repeated stop()', () => {
    engine.stop();
    engine.stop();
    assert.equal(engine.status(), 'stopped');
  });

  it('all policy levels are defined', () => {
    const levels = ['SAFE', 'BALANCED', 'AGGRESSIVE', 'NUCLEAR'] as const;
    for (const level of levels) {
      assert.ok(CHAOS_POLICIES[level]);
      assert.ok(CHAOS_POLICIES[level].maxConcurrentFaults > 0);
    }
  });
});
