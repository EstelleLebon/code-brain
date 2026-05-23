import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdaptiveCognitiveLoop } from '../distributed-cognition/AdaptiveCognitiveLoop.js';
import { DistributedExecutionRuntime } from '../distributed-cognition/DistributedExecutionRuntime.js';
import type {
  CognitiveExecutionRuntime,
  ClusterHealthSnapshot,
  CycleResult,
  DeterministicState,
} from '../distributed-cognition/CognitiveExecutionRuntime.js';

// ── Minimal stub runtime for unit testing ────────────────────────────────────

function makeStubRuntime(overrides: Partial<CognitiveExecutionRuntime> = {}): CognitiveExecutionRuntime {
  let counter = 0;
  return {
    executeCycle(_nodeIds: string[]): CycleResult {
      counter++;
      return {
        executionId: `exec-${counter}`,
        iteration: counter,
        outcome: 'success',
        affectedNodes: [],
        recoveryTriggered: false,
      };
    },
    recoverNode(): boolean { return true; },
    synchronizeCluster(): void {},
    getClusterHealth(): ClusterHealthSnapshot {
      return { globalTrust: 1.0, consensusHealth: 1.0, activeRecoveryPlans: 0, unstableNodeCount: 0, quarantinedNodeCount: 0 };
    },
    getDeterministicState(): DeterministicState {
      return { logicalClock: counter, iteration: counter, aggression: 0.7, stableIterations: 0, rebalancePending: false };
    },
    reset(): void { counter = 0; },
    ...overrides,
  };
}

describe('AdaptiveCognitiveLoop', () => {
  it('starts with balanced strategy', () => {
    const loop = new AdaptiveCognitiveLoop(makeStubRuntime());
    assert.equal(loop.currentStrategy(), 'balanced');
  });

  it('runCycle returns a valid decision', () => {
    const loop = new AdaptiveCognitiveLoop(makeStubRuntime());
    const decision = loop.runCycle(['n1', 'n2']);
    assert.equal(decision.iteration, 1);
    assert.ok(['aggressive', 'balanced', 'conservative', 'recovery'].includes(decision.strategy));
    assert.ok(decision.score >= 0 && decision.score <= 100);
    assert.ok(decision.adaptationReason.length > 0);
  });

  it('increments iteration on each runCycle', () => {
    const loop = new AdaptiveCognitiveLoop(makeStubRuntime());
    loop.runCycle(['n1']);
    loop.runCycle(['n1']);
    const d = loop.runCycle(['n1']);
    assert.equal(d.iteration, 3);
  });

  it('averageScore tracks score history', () => {
    const loop = new AdaptiveCognitiveLoop(makeStubRuntime());
    loop.runCycle(['n1']);
    loop.runCycle(['n1']);
    const avg = loop.averageScore();
    assert.ok(avg >= 0 && avg <= 100);
  });

  it('escalates to recovery strategy under critical trust', () => {
    let callCount = 0;
    const stub = makeStubRuntime({
      executeCycle(): CycleResult {
        callCount++;
        return { executionId: `e-${callCount}`, iteration: callCount, outcome: 'failure', affectedNodes: ['n1'], recoveryTriggered: false };
      },
      getClusterHealth(): ClusterHealthSnapshot {
        return { globalTrust: 0.1, consensusHealth: 0.1, activeRecoveryPlans: 0, unstableNodeCount: 1, quarantinedNodeCount: 0 };
      },
    });
    const loop = new AdaptiveCognitiveLoop(stub);
    // Run enough failures to cross threshold
    for (let i = 0; i < 4; i++) loop.runCycle(['n1']);
    assert.equal(loop.currentStrategy(), 'recovery');
  });

  it('escalates to conservative under degraded trust', () => {
    const stub = makeStubRuntime({
      executeCycle(): CycleResult {
        return { executionId: 'e1', iteration: 1, outcome: 'degraded', affectedNodes: [], recoveryTriggered: false };
      },
      getClusterHealth(): ClusterHealthSnapshot {
        return { globalTrust: 0.4, consensusHealth: 0.4, activeRecoveryPlans: 0, unstableNodeCount: 0, quarantinedNodeCount: 0 };
      },
    });
    const loop = new AdaptiveCognitiveLoop(stub);
    loop.runCycle(['n1']);
    assert.equal(loop.currentStrategy(), 'conservative');
  });

  it('reset clears all state', () => {
    const loop = new AdaptiveCognitiveLoop(makeStubRuntime());
    loop.runCycle(['n1']);
    loop.runCycle(['n1']);
    loop.reset();
    assert.equal(loop.averageScore(), 0);
    assert.equal(loop.getDecisions().length, 0);
    assert.equal(loop.currentStrategy(), 'balanced');
  });

  it('recoverNode delegates to runtime', () => {
    let called = false;
    const stub = makeStubRuntime({
      recoverNode(): boolean { called = true; return true; },
    });
    const loop = new AdaptiveCognitiveLoop(stub);
    const ok = loop.recoverNode('n1');
    assert.ok(called);
    assert.ok(ok);
  });
});

describe('DistributedExecutionRuntime', () => {
  it('executeCycle returns valid CycleResult', () => {
    const runtime = new DistributedExecutionRuntime();
    const result = runtime.executeCycle(['n1', 'n2', 'n3']);
    assert.ok(result.executionId.startsWith('exec-'));
    assert.ok(['success', 'failure', 'timeout', 'partition', 'degraded'].includes(result.outcome));
    assert.ok(Array.isArray(result.affectedNodes));
  });

  it('getClusterHealth returns bounded values', () => {
    const runtime = new DistributedExecutionRuntime();
    runtime.executeCycle(['n1']);
    const health = runtime.getClusterHealth();
    assert.ok(health.globalTrust >= 0 && health.globalTrust <= 1);
    assert.ok(health.consensusHealth >= 0 && health.consensusHealth <= 1);
    assert.ok(health.unstableNodeCount >= 0);
    assert.ok(health.quarantinedNodeCount >= 0);
  });

  it('getDeterministicState returns bounded values', () => {
    const runtime = new DistributedExecutionRuntime();
    runtime.executeCycle(['n1']);
    const state = runtime.getDeterministicState();
    assert.ok(state.aggression >= 0 && state.aggression <= 1);
    assert.ok(state.iteration >= 0);
    assert.ok(state.logicalClock >= 0);
  });

  it('recoverNode returns boolean without throwing', () => {
    const runtime = new DistributedExecutionRuntime();
    const ok = runtime.recoverNode('n1', 'test recovery');
    assert.ok(typeof ok === 'boolean');
  });

  it('synchronizeCluster does not throw', () => {
    const runtime = new DistributedExecutionRuntime();
    assert.doesNotThrow(() => runtime.synchronizeCluster(['n1', 'n2', 'n3']));
  });

  it('reset restores initial state', () => {
    const runtime = new DistributedExecutionRuntime();
    for (let i = 0; i < 5; i++) runtime.executeCycle(['n1', 'n2']);
    runtime.reset();
    const state = runtime.getDeterministicState();
    assert.equal(state.logicalClock, 0);
    assert.equal(state.iteration, 0);
  });

  it('produces deterministic scores for identical inputs', () => {
    function runSequence(): number[] {
      const runtime = new DistributedExecutionRuntime();
      const loop = new AdaptiveCognitiveLoop(runtime);
      return Array.from({ length: 5 }, () => loop.runCycle(['n1', 'n2']).score);
    }
    const a = runSequence();
    const b = runSequence();
    assert.deepEqual(a, b);
  });
});

describe('CognitiveExecutionRuntime — contract tests', () => {
  it('DistributedExecutionRuntime satisfies CognitiveExecutionRuntime contract', () => {
    const runtime: CognitiveExecutionRuntime = new DistributedExecutionRuntime();
    assert.ok(typeof runtime.executeCycle === 'function');
    assert.ok(typeof runtime.recoverNode === 'function');
    assert.ok(typeof runtime.synchronizeCluster === 'function');
    assert.ok(typeof runtime.getClusterHealth === 'function');
    assert.ok(typeof runtime.getDeterministicState === 'function');
    assert.ok(typeof runtime.reset === 'function');
  });
});
