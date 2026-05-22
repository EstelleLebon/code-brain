import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FaultInjector, FaultScenario } from '../stress-testing/FaultInjection.js';

function scenario(overrides: Partial<FaultScenario> = {}): FaultScenario {
  return {
    id: 'test',
    faultType: 'random_failure',
    probability: 1.0,
    ...overrides,
  };
}

describe('FaultInjector', () => {
  let injector: FaultInjector;

  beforeEach(() => {
    injector = new FaultInjector(42);
  });

  it('injects a fault and returns it', () => {
    const fault = injector.inject(scenario());
    assert.ok(fault.id);
    assert.equal(fault.triggerCount, 0);
    assert.ok(fault.injectedAt instanceof Date);
  });

  it('activeFaults returns injected faults', () => {
    injector.inject(scenario());
    injector.inject(scenario({ faultType: 'trust_drift' }));
    assert.equal(injector.activeFaults().length, 2);
  });

  it('clear removes a fault', () => {
    const fault = injector.inject(scenario());
    const ok = injector.clear(fault.id);
    assert.ok(ok);
    assert.equal(injector.activeFaults().length, 0);
  });

  it('clearAll removes all faults', () => {
    injector.inject(scenario());
    injector.inject(scenario({ faultType: 'event_loss' }));
    injector.clearAll();
    assert.equal(injector.activeFaults().length, 0);
  });

  it('shouldTrigger returns false when no faults active', () => {
    const result = injector.shouldTrigger('random_failure');
    assert.equal(result.triggered, false);
  });

  it('shouldTrigger returns true with probability=1', () => {
    injector.inject(scenario({ probability: 1.0 }));
    const result = injector.shouldTrigger('random_failure');
    assert.equal(result.triggered, true);
    assert.ok(result.fault);
  });

  it('shouldTrigger increments triggerCount', () => {
    const fault = injector.inject(scenario({ probability: 1.0 }));
    injector.shouldTrigger('random_failure');
    injector.shouldTrigger('random_failure');
    assert.equal(fault.triggerCount, 2);
  });

  it('scoped faults only trigger for matching executionId', () => {
    injector.inject(scenario({ executionId: 'exec-A', probability: 1.0 }));
    const forB = injector.shouldTrigger('random_failure', 'exec-B');
    assert.equal(forB.triggered, false);
    const forA = injector.shouldTrigger('random_failure', 'exec-A');
    assert.equal(forA.triggered, true);
  });

  it('global faults trigger for any executionId', () => {
    injector.inject(scenario({ probability: 1.0 }));
    const result = injector.shouldTrigger('random_failure', 'any-exec');
    assert.equal(result.triggered, true);
  });

  it('deterministic mode with same seed produces same result', () => {
    const a = new FaultInjector(99);
    const b = new FaultInjector(99);
    a.inject(scenario({ probability: 0.5 }));
    b.inject(scenario({ probability: 0.5 }));
    const ra = a.shouldTrigger('random_failure');
    const rb = b.shouldTrigger('random_failure');
    assert.equal(ra.triggered, rb.triggered);
  });

  it('clear returns false for unknown id', () => {
    const ok = injector.clear('nonexistent');
    assert.equal(ok, false);
  });

  it('supports all fault types', () => {
    const types = [
      'runtime_timeout', 'memory_pressure', 'random_failure',
      'corrupted_retrieval', 'trust_drift', 'event_loss',
      'partial_rollback', 'stale_snapshot',
    ] as const;
    for (const type of types) {
      injector.inject(scenario({ faultType: type, probability: 1.0 }));
    }
    assert.equal(injector.activeFaults().length, types.length);
  });
});
