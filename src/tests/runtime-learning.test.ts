import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SuccessPatternMemory } from '../learning/SuccessPatternMemory.js';
import { RuntimeLearningEngine } from '../learning/RuntimeLearningEngine.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

function makeSignal(type: string): RuntimeSignal {
  return { id: `sig-${type}`, signalType: type as any, status: 'success', source: 'test', timestamp: Date.now() };
}

function makeOutcome(outcome: 'success' | 'failure', riskObserved = 0): ExecutionOutcome {
  return {
    id: 'out-1',
    operationId: 'op-1',
    outcome,
    signals: [makeSignal('typecheck'), makeSignal('test')],
    riskObserved,
    summary: [],
    timestamp: Date.now(),
  };
}

describe('SuccessPatternMemory', () => {
  test('records a new success pattern', () => {
    const mem = new SuccessPatternMemory();
    const p = mem.record('rename', ['ctx-a', 'ctx-b'], 20);
    assert.equal(p.operationType, 'rename');
    assert.equal(p.successCount, 1);
    assert.equal(p.averageRisk, 20);
  });

  test('deduplicates similar patterns', () => {
    const mem = new SuccessPatternMemory();
    mem.record('rename', ['ctx-a', 'ctx-b'], 20);
    mem.record('rename', ['ctx-a', 'ctx-b'], 30);
    assert.equal(mem.getAll().length, 1);
    assert.equal(mem.getAll()[0].successCount, 2);
  });

  test('averageRisk is updated correctly', () => {
    const mem = new SuccessPatternMemory();
    mem.record('rename', ['ctx-a'], 20);
    mem.record('rename', ['ctx-a'], 40);
    const p = mem.getAll()[0]!;
    assert.equal(p.averageRisk, 30);
  });

  test('topBySuccessRate returns sorted results', () => {
    const mem = new SuccessPatternMemory();
    mem.record('rename', ['ctx-a'], 10);
    mem.record('rename', ['ctx-a'], 10); // count=2
    mem.record('extract', ['ctx-b'], 5);
    const top = mem.topBySuccessRate(2);
    assert.equal(top[0].operationType, 'rename');
    assert.equal(top[0].successCount, 2);
  });
});

describe('RuntimeLearningEngine', () => {
  test('success outcome records success pattern', () => {
    const engine = new RuntimeLearningEngine();
    const result = engine.observe(makeOutcome('success', 10));
    assert.equal(result.outcome, 'success');
    assert.ok(result.successPatternId);
    assert.equal(engine.successMemory.getAll().length, 1);
  });

  test('failure outcome records failure pattern', () => {
    const engine = new RuntimeLearningEngine();
    const out: ExecutionOutcome = {
      id: 'out-1',
      operationId: 'op-1',
      outcome: 'failure',
      signals: [{ id: 'sig-1', signalType: 'build', status: 'failure', source: 'rename', timestamp: Date.now() }],
      riskObserved: 80,
      summary: [],
      timestamp: Date.now(),
    };
    const result = engine.observe(out);
    assert.equal(result.outcome, 'failure_learned');
    assert.ok(result.failureLearning?.patternRecorded);
    assert.ok(result.failureLearning?.patternId);
    assert.equal(engine.failureMemory.all().length, 1);
  });

  test('multiple outcomes build memory over time', () => {
    const engine = new RuntimeLearningEngine();
    const success = makeOutcome('success', 5);
    const fail: ExecutionOutcome = {
      id: 'out-2', operationId: 'op-2', outcome: 'failure',
      signals: [{ id: 's', signalType: 'test', status: 'failure', source: 'op', timestamp: Date.now() }],
      riskObserved: 60, summary: [], timestamp: Date.now(),
    };
    engine.observe(success);
    engine.observe(success);
    engine.observe(fail);
    assert.equal(engine.successMemory.getAll()[0].successCount, 2);
    assert.equal(engine.failureMemory.all().length, 1);
  });
});
