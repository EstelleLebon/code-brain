import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StressRunner } from '../stress-testing/StressRunner.js';
import { FaultInjector } from '../stress-testing/FaultInjection.js';
import { StressScenario, SCENARIOS } from '../stress-testing/StressScenario.js';

function quickScenario(label = 'test'): StressScenario {
  return {
    id: `quick-${label}`,
    label,
    stages: [
      {
        id: 's1',
        label: 'fast stage',
        durationMs: 100,
        faults: [{ type: 'random_failure', probability: 0.8 }],
      },
    ],
  };
}

describe('StressRunner', () => {
  let runner: StressRunner;

  beforeEach(() => {
    runner = new StressRunner(new FaultInjector(7));
  });

  it('returns a StressReport after running a scenario', async () => {
    const report = await runner.runScenario(quickScenario());
    assert.equal(report.scenarioId, 'quick-test');
    assert.ok(report.startedAt instanceof Date);
    assert.ok(report.completedAt instanceof Date);
    assert.ok(typeof report.totalFaultsTriggered === 'number');
  });

  it('report has stageResults for each stage', async () => {
    const report = await runner.runScenario(quickScenario());
    assert.equal(report.stageResults.length, 1);
    assert.equal(report.stageResults[0].stageId, 's1');
  });

  it('metrics accumulate across runs', async () => {
    await runner.runScenario(quickScenario('a'));
    await runner.runScenario(quickScenario('b'));
    const m = runner.metrics();
    assert.equal(m.totalRuns, 2);
    assert.ok(m.passRate >= 0 && m.passRate <= 1);
  });

  it('runBatch executes multiple scenarios', async () => {
    const reports = await runner.runBatch([quickScenario('x'), quickScenario('y')]);
    assert.equal(reports.length, 2);
  });

  it('abort stops batch mid-way', async () => {
    const longScenario: StressScenario = {
      id: 'long',
      label: 'long',
      stages: [
        { id: 's1', label: 'a', durationMs: 50, faults: [] },
        { id: 's2', label: 'b', durationMs: 50, faults: [] },
        { id: 's3', label: 'c', durationMs: 50, faults: [] },
      ],
    };
    // Abort immediately
    setTimeout(() => runner.abort(), 10);
    const report = await runner.runScenario(longScenario);
    assert.equal(report.aborted, true);
  });

  it('reports() returns all historical reports', async () => {
    await runner.runScenario(quickScenario());
    assert.equal(runner.reports().length, 1);
  });

  it('runs built-in repeated_failures scenario', async () => {
    const report = await runner.runScenario(SCENARIOS['repeated_failures']);
    assert.equal(report.scenarioId, 'repeated_failures');
    assert.ok(report.stageResults.length >= 2);
  });

  it('runs built-in cascading_rollbacks scenario', async () => {
    const report = await runner.runScenario(SCENARIOS['cascading_rollbacks']);
    assert.equal(report.scenarioId, 'cascading_rollbacks');
  });

  it('metrics passRate is 1 for zero-fault scenario', async () => {
    const noFault: StressScenario = {
      id: 'nf',
      label: 'no fault',
      stages: [{ id: 's1', label: 'empty', durationMs: 50, faults: [] }],
    };
    await runner.runScenario(noFault);
    const m = runner.metrics();
    assert.equal(m.passRate, 1);
  });
});
