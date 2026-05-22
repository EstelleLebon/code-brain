import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeterminismValidator } from '../reproducibility/DeterminismValidator.js';
import { fingerprintExecution } from '../reproducibility/ExecutionFingerprint.js';

describe('DeterminismValidator', () => {
  let validator: DeterminismValidator;

  beforeEach(() => {
    validator = new DeterminismValidator();
  });

  it('validateReplay warns with fewer than 2 fingerprints', () => {
    validator.registerFingerprint(fingerprintExecution({ executionId: 'e1' }));
    const result = validator.validateReplay('e1');
    assert.equal(result.result, 'warn');
  });

  it('validateReplay passes for identical replays', () => {
    const fp1 = fingerprintExecution({ executionId: 'e2', cognitiveMode: 'focused' });
    const fp2 = fingerprintExecution({ executionId: 'e2', cognitiveMode: 'focused' });
    validator.registerFingerprint(fp1);
    validator.registerFingerprint(fp2);
    const result = validator.validateReplay('e2');
    assert.equal(result.result, 'pass');
    assert.equal(result.similarity, 1);
  });

  it('validateReplay fails on high divergence', () => {
    const fp1 = fingerprintExecution({
      executionId: 'e3',
      cognitiveMode: 'focused',
      trustLevel: 0.9,
      planTopology: 'a,b,c',
      mutations: ['x'],
      events: ['start'],
    });
    const fp2 = fingerprintExecution({
      executionId: 'e3',
      cognitiveMode: 'exploratory',
      trustLevel: 0.1,
      planTopology: 'z,y',
      mutations: ['q', 'r'],
      events: ['end'],
    });
    validator.registerFingerprint(fp1);
    validator.registerFingerprint(fp2);
    const result = validator.validateReplay('e3');
    assert.ok(['warn', 'fail'].includes(result.result));
  });

  it('validateSnapshots returns pass when all hashes match', () => {
    const fp1 = fingerprintExecution({ executionId: 'e4', cognitiveMode: 'focused' });
    const fp2 = fingerprintExecution({ executionId: 'e4', cognitiveMode: 'focused' });
    validator.registerFingerprint(fp1);
    validator.registerFingerprint(fp2);
    const result = validator.validateSnapshots('e4');
    assert.equal(result, 'pass');
  });

  it('validateSnapshots returns warn/fail on hash mismatch', () => {
    const fp1 = fingerprintExecution({ executionId: 'e5', cognitiveMode: 'a' });
    const fp2 = fingerprintExecution({ executionId: 'e5', cognitiveMode: 'b' });
    const fp3 = fingerprintExecution({ executionId: 'e5', cognitiveMode: 'c' });
    validator.registerFingerprint(fp1);
    validator.registerFingerprint(fp2);
    validator.registerFingerprint(fp3);
    const result = validator.validateSnapshots('e5');
    assert.ok(['warn', 'fail'].includes(result));
  });

  it('validateDeterminism returns overall report', () => {
    const fp1 = fingerprintExecution({ executionId: 'e6', cognitiveMode: 'focused' });
    const fp2 = fingerprintExecution({ executionId: 'e6', cognitiveMode: 'focused' });
    validator.registerFingerprint(fp1);
    validator.registerFingerprint(fp2);
    const report = validator.validateDeterminism('e6');
    assert.equal(report.executionId, 'e6');
    assert.ok(['pass', 'warn', 'fail'].includes(report.overall));
    assert.ok(Array.isArray(report.notes));
  });

  it('reset clears fingerprints for specific executionId', () => {
    validator.registerFingerprint(fingerprintExecution({ executionId: 'e7' }));
    validator.reset('e7');
    const result = validator.validateReplay('e7');
    assert.equal(result.result, 'warn');
    assert.ok(result.notes[0].includes('fewer than 2'));
  });

  it('reset without args clears all', () => {
    validator.registerFingerprint(fingerprintExecution({ executionId: 'e8' }));
    validator.registerFingerprint(fingerprintExecution({ executionId: 'e9' }));
    validator.reset();
    assert.equal(validator.validateReplay('e8').result, 'warn');
    assert.equal(validator.validateReplay('e9').result, 'warn');
  });

  it('overall pass when all sub-checks pass', () => {
    const base = { executionId: 'e10', cognitiveMode: 'stable', trustLevel: 0.9 };
    validator.registerFingerprint(fingerprintExecution(base));
    validator.registerFingerprint(fingerprintExecution(base));
    const report = validator.validateDeterminism('e10');
    assert.equal(report.overall, 'pass');
  });
});
