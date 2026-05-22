import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeSignalCollector } from '../runtime-awareness/RuntimeSignalCollector.js';
import { OutcomeClassifier } from '../outcomes/OutcomeClassifier.js';
import { OutcomeAnalyzer } from '../outcomes/OutcomeAnalyzer.js';
import { OutcomeCorrelation } from '../outcomes/OutcomeCorrelation.js';

describe('OutcomeClassifier', () => {
  const col = new RuntimeSignalCollector({ source: 'test' });
  const clf = new OutcomeClassifier();

  it('empty signals → success', () => {
    assert.equal(clf.classify([]).outcome, 'success');
  });

  it('build failure → regression', () => {
    const signals = [col.collect('build', 'failure'), col.collect('test', 'success')];
    assert.equal(clf.classify(signals).outcome, 'regression');
  });

  it('test + build failures → failure', () => {
    const signals = [col.collect('build', 'failure'), col.collect('test', 'failure')];
    assert.equal(clf.classify(signals).outcome, 'failure');
  });

  it('only warnings → partial_success', () => {
    const signals = [col.collect('lint', 'warning')];
    assert.equal(clf.classify(signals).outcome, 'partial_success');
  });

  it('all success → success', () => {
    const signals = [col.collect('test', 'success'), col.collect('build', 'success')];
    assert.equal(clf.classify(signals).outcome, 'success');
  });
});

describe('OutcomeAnalyzer', () => {
  it('records correlation after each analysis', () => {
    const col = new RuntimeSignalCollector({ source: 'x' });
    const analyzer = new OutcomeAnalyzer();
    const signals = [col.collect('test', 'success')];
    analyzer.analyze('op-1', 'rename_symbol', signals);
    analyzer.analyze('op-2', 'rename_symbol', signals);
    const corr = analyzer.correlation.correlate('rename_symbol');
    assert.equal(corr.totalCount, 2);
    assert.equal(corr.successRate, 1);
  });

  it('riskObserved is 0 for passing signals', () => {
    const col = new RuntimeSignalCollector({ source: 'x' });
    const analyzer = new OutcomeAnalyzer();
    const outcome = analyzer.analyze('op-1', 'rename_symbol', [col.collect('build', 'success')]);
    assert.equal(outcome.riskObserved, 0);
  });
});

describe('OutcomeCorrelation', () => {
  it('failure rate calculation', () => {
    const col = new RuntimeSignalCollector({ source: 'x' });
    const clf = new OutcomeClassifier();
    const corr = new OutcomeCorrelation();
    const fail = [col.collect('build', 'failure')];
    const pass = [col.collect('build', 'success')];

    const makeOutcome = (signals: ReturnType<RuntimeSignalCollector['collect']>[]) => ({
      id: 'x',
      operationId: 'x',
      outcome: clf.classify(signals).outcome,
      signals,
      riskObserved: 0,
      summary: [] as string[],
      timestamp: Date.now(),
    } as const);

    corr.record('move_function', makeOutcome(fail));
    corr.record('move_function', makeOutcome(pass));
    const entry = corr.correlate('move_function');
    assert.equal(entry.failureRate, 0.5);
    assert.equal(entry.totalCount, 2);
  });
});
