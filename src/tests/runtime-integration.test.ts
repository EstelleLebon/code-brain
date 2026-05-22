import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticExecutor } from '../semantic-execution/SemanticExecutor.js';
import { createExecutionContext } from '../semantic-execution/ExecutionContext.js';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';
import { PERMISSIVE_TRUST_POLICY } from '../trust/TrustPolicy.js';
import { OutcomeAnalyzer } from '../outcomes/OutcomeAnalyzer.js';
import { RuntimeSignalCollector } from '../runtime-awareness/RuntimeSignalCollector.js';
import { RuntimeAwareRiskAssessor } from '../risk/RuntimeAwareRiskAssessor.js';
import { RuntimeReplayLog } from '../runtime-replay/RuntimeReplayLog.js';
import { RiskCalibration } from '../calibration/RiskCalibration.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';

const ir = new SemanticIR();

describe('SemanticExecutor ↔ OutcomeAnalyzer integration', () => {
  it('successful execution → success outcome', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const op = ir.createOperation('rename_symbol', ['OldName']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'NewName' };

    const transformation = ir.planTransformation([op]);
    const files = new Map([['a.ts', 'export class OldName {}']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);
    const execResult = executor.execute(transformation, ctx);

    const col = new RuntimeSignalCollector({ source: 'test' });
    const signals = [
      col.collect('test', execResult.success ? 'success' : 'failure'),
      col.collect('build', 'success'),
    ];

    const analyzer = new OutcomeAnalyzer();
    const outcome = analyzer.analyze(transformation.id, 'rename_symbol', signals);

    assert.equal(outcome.outcome, 'success');
    assert.equal(outcome.riskObserved, 0);
  });

  it('failed signals → regression outcome, recorded in RuntimeReplayLog', () => {
    const col = new RuntimeSignalCollector({ source: 'ci' });
    const signals = [col.collect('test', 'failure'), col.collect('build', 'success')];

    const analyzer = new OutcomeAnalyzer();
    const outcome = analyzer.analyze('op-broken', 'move_function', signals);

    assert.equal(outcome.outcome, 'regression');

    const replayLog = new RuntimeReplayLog();
    const event = replayLog.record(
      'op-broken',
      signals.map(s => s.id),
      outcome.id,
      true,
    );
    assert.equal(event.causedRollback, true);
    assert.equal(replayLog.rollbacks().length, 1);
  });
});

describe('RuntimeAwareRiskAssessor ↔ RiskCalibration feedback loop', () => {
  it('calibration from observed outcome adjusts future predictions', () => {
    const assessor = new RuntimeAwareRiskAssessor();
    const op = ir.createOperation('move_function', ['doThing']);

    const initial = assessor.assess(op);
    const initialCalibrated = initial.calibratedScore;

    // Simulate: we saw a much higher risk than predicted
    assessor.calibration.observe('move_function', initial.score, initial.score + 40);

    const after = assessor.assess(op);
    assert.ok(after.calibratedScore > initialCalibrated, 'calibrated score should increase after bad observation');
  });

  it('failure memory boosts risk for subsequent same-pattern operations', () => {
    const mem = new FailureMemory();
    const assessor = new RuntimeAwareRiskAssessor(mem);

    const op = ir.createOperation('split_module', ['UserModule']);
    const baseline = assessor.assess(op, { structuralContext: ['circular-deps'] });
    assert.equal(baseline.failurePatternMatch, false);

    mem.record('split_module', ['circular-deps'], ['5 tests failed', 'circular import'], 9);

    const boosted = assessor.assess(op, { structuralContext: ['circular-deps'] });
    assert.equal(boosted.failurePatternMatch, true);
    assert.ok(boosted.score > baseline.score);
  });
});

describe('Full pipeline: execute → observe → calibrate → replay', () => {
  it('complete flow records all artifacts correctly', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const calibration = new RiskCalibration();
    const replayLog = new RuntimeReplayLog();
    const col = new RuntimeSignalCollector({ source: 'pipeline-test' });
    const analyzer = new OutcomeAnalyzer();

    const op = ir.createOperation('rename_symbol', ['AuthManager']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'AuthService' };
    const transformation = ir.planTransformation([op]);
    const files = new Map([['auth.ts', 'export class AuthManager {}']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);

    const execResult = executor.execute(transformation, ctx);

    const signals = [
      col.collect('test', 'success'),
      col.collect('typecheck', 'success'),
    ];
    const outcome = analyzer.analyze(transformation.id, 'rename_symbol', signals);

    calibration.observe('rename_symbol', execResult.risk.score, outcome.riskObserved);

    const replayEvent = replayLog.record(
      transformation.id,
      signals.map(s => s.id),
      outcome.id,
      false,
    );

    assert.equal(execResult.success, true);
    assert.equal(outcome.outcome, 'success');
    assert.equal(replayEvent.causedRollback, false);
    assert.equal(replayLog.all().length, 1);
    assert.equal(calibration.summary().length, 1);
  });
});
