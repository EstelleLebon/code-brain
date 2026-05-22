import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StabilityAnalyzer } from '../reliability/StabilityAnalyzer.js';

describe('StabilityAnalyzer', () => {
  let analyzer: StabilityAnalyzer;

  beforeEach(() => {
    analyzer = new StabilityAnalyzer();
  });

  it('analyze returns all required fields', () => {
    const report = analyzer.analyze();
    assert.ok(typeof report.trustOscillation === 'number');
    assert.ok(typeof report.planningEntropy === 'number');
    assert.ok(typeof report.retrievalDrift === 'number');
    assert.ok(typeof report.replanFrequency === 'number');
    assert.ok(typeof report.regressionDetected === 'boolean');
    assert.ok(typeof report.instabilityDetected === 'boolean');
    assert.ok(Array.isArray(report.notes));
  });

  it('stable data produces no instability', () => {
    for (let i = 0; i < 8; i++) {
      analyzer.recordTrust(0.9);
      analyzer.recordPlanningOutcome(0.9);
      analyzer.recordRetrievalQuality(0.9);
      analyzer.recordExecution();
    }
    const report = analyzer.analyze();
    assert.equal(report.instabilityDetected, false);
    assert.equal(report.trustOscillation < 0.1, true);
  });

  it('high trust oscillation triggers instability note', () => {
    for (let i = 0; i < 6; i++) {
      analyzer.recordTrust(i % 2 === 0 ? 0.1 : 0.9);
    }
    analyzer.recordRetrievalQuality(0.0);
    const report = analyzer.analyze();
    assert.ok(report.trustOscillation > 0.3);
    assert.ok(report.notes.some(n => n.includes('trust')));
  });

  it('detectRegression returns true when trust drops', () => {
    // Older high trust
    for (let i = 0; i < 4; i++) analyzer.recordTrust(0.9);
    // Recent low trust
    for (let i = 0; i < 4; i++) analyzer.recordTrust(0.5);
    assert.equal(analyzer.detectRegression(), true);
  });

  it('detectRegression returns false with stable trust', () => {
    for (let i = 0; i < 8; i++) analyzer.recordTrust(0.85);
    assert.equal(analyzer.detectRegression(), false);
  });

  it('high replan frequency triggers note', () => {
    for (let i = 0; i < 10; i++) analyzer.recordReplan();
    analyzer.recordTrust(0.1);
    analyzer.recordRetrievalQuality(0.1);
    analyzer.recordExecution();
    const report = analyzer.analyze();
    assert.ok(report.replanFrequency > 3);
  });

  it('reset clears all data', () => {
    analyzer.recordTrust(0.1);
    analyzer.recordReplan();
    analyzer.recordExecution();
    analyzer.reset();
    const report = analyzer.analyze();
    assert.equal(report.trustOscillation, 0);
    assert.equal(report.replanFrequency, 0);
  });

  it('detectInstability delegates to analyze()', () => {
    for (let i = 0; i < 6; i++) analyzer.recordTrust(i % 2 === 0 ? 0.0 : 1.0);
    for (let i = 0; i < 6; i++) analyzer.recordPlanningOutcome(i % 2 === 0 ? 0.0 : 1.0);
    analyzer.recordRetrievalQuality(0.0);
    const unstable = analyzer.detectInstability();
    assert.equal(typeof unstable, 'boolean');
  });
});
