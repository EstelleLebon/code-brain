import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fingerprintExecution,
  compareFingerprints,
  FingerprintInput,
} from '../reproducibility/ExecutionFingerprint.js';

function input(overrides: Partial<FingerprintInput> = {}): FingerprintInput {
  return {
    executionId: 'exec-1',
    planTopology: 'step-a,step-b,step-c',
    mutations: ['mut-1', 'mut-2'],
    runtimeSignals: { cpuLoad: 0.3 },
    events: ['goal_created', 'step_executed'],
    cognitiveMode: 'focused',
    trustLevel: 0.9,
    ...overrides,
  };
}

describe('ExecutionFingerprint', () => {
  it('creates a fingerprint with components and hash', () => {
    const fp = fingerprintExecution(input());
    assert.ok(fp.hash.length > 0);
    assert.ok(fp.components.length > 0);
    assert.equal(fp.executionId, 'exec-1');
    assert.ok(fp.createdAt instanceof Date);
  });

  it('same input produces same hash', () => {
    const fp1 = fingerprintExecution(input());
    const fp2 = fingerprintExecution(input());
    assert.equal(fp1.hash, fp2.hash);
  });

  it('different trust level produces different hash', () => {
    const fp1 = fingerprintExecution(input({ trustLevel: 0.9 }));
    const fp2 = fingerprintExecution(input({ trustLevel: 0.1 }));
    assert.notEqual(fp1.hash, fp2.hash);
  });

  it('different cognitive mode produces different hash', () => {
    const fp1 = fingerprintExecution(input({ cognitiveMode: 'focused' }));
    const fp2 = fingerprintExecution(input({ cognitiveMode: 'exploratory' }));
    assert.notEqual(fp1.hash, fp2.hash);
  });

  it('compareFingerprints returns identical=true for same input', () => {
    const fp1 = fingerprintExecution(input());
    const fp2 = fingerprintExecution(input());
    const diff = compareFingerprints(fp1, fp2);
    assert.equal(diff.identical, true);
    assert.equal(diff.similarityScore, 1);
    assert.equal(diff.diverging.length, 0);
  });

  it('compareFingerprints detects diverging components', () => {
    const fp1 = fingerprintExecution(input({ cognitiveMode: 'focused' }));
    const fp2 = fingerprintExecution(input({ cognitiveMode: 'exploratory' }));
    const diff = compareFingerprints(fp1, fp2);
    assert.equal(diff.identical, false);
    assert.ok(diff.diverging.some(d => d.label === 'cognitive_mode'));
  });

  it('similarity score is between 0 and 1', () => {
    const fp1 = fingerprintExecution(input());
    const fp2 = fingerprintExecution(input({ cognitiveMode: 'x', trustLevel: 0.1, planTopology: 'y' }));
    const diff = compareFingerprints(fp1, fp2);
    assert.ok(diff.similarityScore >= 0 && diff.similarityScore <= 1);
  });

  it('handles missing optional fields gracefully', () => {
    const fp = fingerprintExecution({ executionId: 'bare' });
    assert.ok(fp.hash.length > 0);
  });

  it('mutation order does not affect hash (sorted)', () => {
    const fp1 = fingerprintExecution(input({ mutations: ['a', 'b', 'c'] }));
    const fp2 = fingerprintExecution(input({ mutations: ['c', 'a', 'b'] }));
    assert.equal(fp1.hash, fp2.hash);
  });
});
