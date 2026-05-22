import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FailureMemory } from '../failure-memory/FailureMemory.js';

describe('FailureMemory', () => {
  it('records a new pattern', () => {
    const mem = new FailureMemory();
    const p = mem.record('split_module', ['circular-deps', 'react-context'], ['3 tests failed'], 7);
    assert.equal(p.operationType, 'split_module');
    assert.equal(p.frequency, 1);
    assert.equal(p.severity, 7);
  });

  it('increments frequency for similar patterns', () => {
    const mem = new FailureMemory();
    mem.record('split_module', ['circular-deps'], ['build failed'], 5);
    mem.record('split_module', ['circular-deps'], ['tests failed'], 6);
    const all = mem.all();
    assert.equal(all.length, 1);
    assert.equal(all[0].frequency, 2);
    assert.equal(all[0].severity, 6);
  });

  it('creates separate pattern for different operation type', () => {
    const mem = new FailureMemory();
    mem.record('split_module', ['a'], ['x'], 5);
    mem.record('rename_symbol', ['a'], ['y'], 3);
    assert.equal(mem.all().length, 2);
  });

  it('search by operation type', () => {
    const mem = new FailureMemory();
    mem.record('split_module', ['a'], ['x'], 5);
    mem.record('rename_symbol', ['b'], ['y'], 3);
    assert.equal(mem.search('split_module').length, 1);
  });

  it('topBySeverity returns sorted results', () => {
    const mem = new FailureMemory();
    mem.record('split_module', ['a'], ['x'], 9);
    mem.record('rename_symbol', ['b'], ['y'], 3);
    const top = mem.topBySeverity(2);
    assert.equal(top[0].severity, 9);
  });
});
