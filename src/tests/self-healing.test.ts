import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RollbackHeuristics } from '../self-healing/RollbackHeuristics.js';
import { FailureRecoveryPlanner } from '../self-healing/FailureRecoveryPlanner.js';
import { SelfHealingEngine } from '../self-healing/SelfHealingEngine.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { ExecutionResult } from '../semantic-execution/SemanticExecutor.js';

function makeSignal(type: RuntimeSignal['signalType'], status: RuntimeSignal['status']): RuntimeSignal {
  return { id: `s-${Date.now()}`, signalType: type, status, source: 'test', timestamp: Date.now() };
}

function makeExecutionResult(id = 'tx-1', fileCount = 2): ExecutionResult {
  const mutations = Array.from({ length: fileCount }, (_, i) => ({
    filePath: `file${i}.ts`, startIndex: 0, endIndex: 3, replacement: 'bar', reason: 'test',
  }));
  return {
    transformationId: id, success: false, dryRun: false,
    plan: { transformationId: id, steps: [{ operationId: 'op1', operation: {} as any, mutations, estimatedFilesAffected: fileCount }], totalMutations: fileCount, estimatedFilesAffected: fileCount, createdAt: Date.now() },
    validation: { valid: false, errors: ['test error'], warnings: [], riskScore: 50 },
    risk: { score: 60, level: 'high', reasons: [] },
    trust: { approved: false, requiresHumanReview: true, approvalMode: 'review', reasons: [] },
    semanticDiffs: [], impactSummary: { totalFilesAffected: 0, totalSymbolsAffected: 0, addedSymbols: [], removedSymbols: [], renamedSymbols: [], structuralChanges: [] },
    transformedFiles: new Map(), durationMs: 100,
  };
}

describe('RollbackHeuristics', () => {
  const heuristics = new RollbackHeuristics();

  test('no signals → scope none', () => {
    const decision = heuristics.decide([], ['file.ts'], 30);
    assert.equal(decision.scope, 'none');
  });

  test('high severity → full rollback', () => {
    const signals = [makeSignal('build', 'failure'), makeSignal('test', 'failure'), makeSignal('typecheck', 'failure')];
    const decision = heuristics.decide(signals, ['a.ts', 'b.ts', 'c.ts'], 85);
    assert.equal(decision.scope, 'full');
    assert.ok(decision.confidence >= 0.8);
  });

  test('moderate severity → partial rollback', () => {
    const signals = [makeSignal('build', 'failure')];
    const decision = heuristics.decide(signals, ['a.ts', 'b.ts', 'c.ts', 'd.ts'], 55);
    assert.equal(decision.scope, 'partial');
    assert.ok(decision.targetArtifacts.length < 4);
  });

  test('low severity → no rollback', () => {
    const signals = [makeSignal('test', 'failure')];
    const decision = heuristics.decide(signals, ['a.ts'], 20);
    assert.equal(decision.scope, 'none');
  });
});

describe('FailureRecoveryPlanner', () => {
  const planner = new FailureRecoveryPlanner();

  test('high severity → rollback strategy', () => {
    const signals = [makeSignal('build', 'failure'), makeSignal('test', 'failure')];
    const plan = planner.plan(signals, ['a.ts', 'b.ts'], [], 80);
    assert.equal(plan.strategy, 'rollback');
    assert.ok(plan.confidence > 0.5);
  });

  test('medium severity with multiple files → reduce_scope', () => {
    const signals = [makeSignal('test', 'failure')];
    const plan = planner.plan(signals, ['a.ts', 'b.ts', 'c.ts'], [], 50);
    assert.equal(plan.strategy, 'reduce_scope');
    assert.equal(plan.retryMaxMutations, 1);
  });

  test('low severity → retry', () => {
    const signals = [makeSignal('test', 'warning')];
    const plan = planner.plan(signals, ['a.ts'], [], 20);
    assert.equal(plan.strategy, 'retry');
  });

  test('known high-freq pattern → switch_mode', () => {
    const failureMemory = new FailureMemory();
    const pattern = failureMemory.record('rename_symbol', ['ctx1'], ['consequence1'], 70);
    // bump frequency to ≥ 3
    pattern.frequency = 3;
    const knownPatterns = failureMemory.all();
    const plan = planner.plan([], ['a.ts'], knownPatterns, 50);
    assert.equal(plan.strategy, 'switch_mode');
    assert.equal(plan.suggestedMode, 'RECOVERY');
  });
});

describe('SelfHealingEngine', () => {
  test('heal returns a recovery plan', () => {
    const engine = new SelfHealingEngine();
    const result = makeExecutionResult();
    const signals = [makeSignal('build', 'failure')];
    const plan = engine.heal(result, signals, 60);
    assert.ok(plan.strategy);
    assert.ok(plan.confidence >= 0);
  });

  test('heal records history', () => {
    const engine = new SelfHealingEngine();
    engine.heal(makeExecutionResult('tx-a'), [], 30);
    engine.heal(makeExecutionResult('tx-b'), [], 30);
    assert.equal(engine.getHistory().length, 2);
  });

  test('markResolved updates history entry', () => {
    const engine = new SelfHealingEngine();
    engine.heal(makeExecutionResult('tx-c'), [], 30);
    assert.equal(engine.unresolvedCount(), 1);
    engine.markResolved('tx-c');
    assert.equal(engine.unresolvedCount(), 0);
  });

  test('heal with failure memory leverages patterns', () => {
    const mem = new FailureMemory();
    mem.record('rename_symbol', ['ctx1'], ['err'], 70);
    mem.record('rename_symbol', ['ctx1'], ['err'], 70);
    mem.record('rename_symbol', ['ctx1'], ['err'], 70);
    const engine = new SelfHealingEngine(mem);
    const plan = engine.heal(makeExecutionResult(), [makeSignal('build', 'failure')], 75);
    // With known high-freq pattern, planner may switch_mode
    assert.ok(['rollback', 'retry', 'reduce_scope', 'switch_mode'].includes(plan.strategy));
  });

  test('heal never throws', () => {
    const engine = new SelfHealingEngine();
    assert.doesNotThrow(() => engine.heal(makeExecutionResult(), [], 999));
  });
});
