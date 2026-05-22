import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calibrate } from '../calibration/ConfidenceCalibration.js';
import { CalibrationMemory } from '../calibration/CalibrationMemory.js';
import { RiskCalibration } from '../calibration/RiskCalibration.js';

describe('calibrate', () => {
  it('accurate when delta is within threshold', () => {
    const r = calibrate(50, 58);
    assert.equal(r.direction, 'accurate');
    assert.equal(r.calibrationDelta, 8);
  });

  it('underestimated when observed >> predicted', () => {
    const r = calibrate(20, 80);
    assert.equal(r.direction, 'underestimated');
  });

  it('overestimated when observed << predicted', () => {
    const r = calibrate(80, 20);
    assert.equal(r.direction, 'overestimated');
  });
});

describe('CalibrationMemory', () => {
  it('averageDelta is null for unknown type', () => {
    const mem = new CalibrationMemory();
    assert.equal(mem.averageDelta('rename_symbol'), null);
  });

  it('adjustedRisk returns raw prediction when no history', () => {
    const mem = new CalibrationMemory();
    assert.equal(mem.adjustedRisk('rename_symbol', 30), 30);
  });

  it('adjustedRisk applies average delta', () => {
    const mem = new CalibrationMemory();
    mem.record('move_function', calibrate(20, 40));
    mem.record('move_function', calibrate(30, 50));
    const adjusted = mem.adjustedRisk('move_function', 25);
    assert.equal(adjusted, 45);
  });
});

describe('RiskCalibration', () => {
  it('predict adjusts after observations', () => {
    const rc = new RiskCalibration();
    rc.observe('split_module', 30, 60);
    const predicted = rc.predict('split_module', 30);
    assert.equal(predicted, 60);
  });

  it('summary returns correct entry', () => {
    const rc = new RiskCalibration();
    rc.observe('rename_symbol', 10, 15);
    const s = rc.summary();
    assert.equal(s.length, 1);
    assert.equal(s[0].operationType, 'rename_symbol');
    assert.equal(s[0].sampleCount, 1);
  });
});
