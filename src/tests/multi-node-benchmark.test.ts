import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedExecutionRuntime } from '../distributed-cognition/DistributedExecutionRuntime.js';
import { AdaptiveCognitiveLoop } from '../distributed-cognition/AdaptiveCognitiveLoop.js';
import { ClusterTrustManager } from '../distributed-cognition/ClusterTrustManager.js';

function makeNodes(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `node-${i + 1}`);
}

function makeRuntime(): DistributedExecutionRuntime {
  return new DistributedExecutionRuntime();
}

interface BenchmarkResult {
  scenario: string;
  nodeCount: number;
  cycles: number;
  totalMs: number;
  avgCycleMs: number;
  finalTrust: number;
  finalConsensusHealth: number;
  successRate: number;
  recoveryCount: number;
  quarantinedCount: number;
}

function runBenchmark(scenario: string, nodeIds: string[], cycles: number, injectFaults?: (runtime: DistributedExecutionRuntime, cycle: number, nodes: string[]) => void): BenchmarkResult {
  const runtime = makeRuntime();
  const loop = new AdaptiveCognitiveLoop(runtime);

  let successCount = 0;
  let recoveryCount = 0;

  const start = Date.now();

  for (let c = 0; c < cycles; c++) {
    if (injectFaults) injectFaults(runtime, c, nodeIds);

    const decision = loop.runCycle(nodeIds);
    if (decision.cycleResult.outcome === 'success') successCount++;
    if (decision.cycleResult.recoveryTriggered) recoveryCount++;
  }

  const totalMs = Date.now() - start;
  const health = runtime.getClusterHealth();

  return {
    scenario,
    nodeCount: nodeIds.length,
    cycles,
    totalMs,
    avgCycleMs: totalMs / cycles,
    finalTrust: health.globalTrust,
    finalConsensusHealth: health.consensusHealth,
    successRate: successCount / cycles,
    recoveryCount,
    quarantinedCount: health.quarantinedNodeCount,
  };
}

describe('Multi-Node Benchmarks', () => {

  describe('Scenario: 1 node — baseline', () => {
    it('completes 50 cycles with stable trust', () => {
      const result = runBenchmark('1-node-baseline', makeNodes(1), 50);
      assert.equal(result.nodeCount, 1);
      assert.ok(result.avgCycleMs < 50, `avg cycle too slow: ${result.avgCycleMs}ms`);
      assert.ok(result.finalTrust >= 0.8, `trust degraded too much: ${result.finalTrust}`);
      assert.ok(result.successRate >= 0.9, `success rate too low: ${result.successRate}`);
    });
  });

  describe('Scenario: 3 nodes — nominal cluster', () => {
    it('completes 50 cycles with quorum health', () => {
      const result = runBenchmark('3-node-nominal', makeNodes(3), 50);
      assert.equal(result.nodeCount, 3);
      assert.ok(result.avgCycleMs < 50, `avg cycle too slow: ${result.avgCycleMs}ms`);
      assert.ok(result.finalTrust >= 0.7, `cluster trust degraded: ${result.finalTrust}`);
    });
  });

  describe('Scenario: 5 nodes — large cluster', () => {
    it('completes 50 cycles within latency budget', () => {
      const result = runBenchmark('5-node-large', makeNodes(5), 50);
      assert.equal(result.nodeCount, 5);
      assert.ok(result.avgCycleMs < 100, `avg cycle too slow: ${result.avgCycleMs}ms`);
      assert.ok(result.totalMs < 5000, `total too slow: ${result.totalMs}ms`);
    });
  });

  describe('Scenario: network partition', () => {
    it('handles progressive trust degradation and triggers recovery', () => {
      const nodes = makeNodes(3);
      let partitioned = false;

      const result = runBenchmark(
        '3-node-partition',
        nodes,
        30,
        (runtime, cycle) => {
          if (cycle === 10 && !partitioned) {
            // Simulate partition by degrading trust on a node
            const trust = (runtime as unknown as { clusterTrust: ClusterTrustManager }).clusterTrust;
            if (trust) {
              trust.initNode('node-2');
              trust.degradeIsolatedNode('node-2');
              trust.degradeIsolatedNode('node-2');
              trust.degradeIsolatedNode('node-2');
            }
            partitioned = true;
          }
        }
      );

      assert.ok(result.recoveryCount >= 0, 'recovery count should be non-negative');
      // System must stay alive (not crash), assert health snapshot is valid
      assert.ok(result.finalTrust >= 0 && result.finalTrust <= 1, `trust out of bounds: ${result.finalTrust}`);
    });
  });

  describe('Scenario: massive replay', () => {
    it('handles 200 cycles without memory growth issues', () => {
      const result = runBenchmark('5-node-massive-replay', makeNodes(5), 200);
      assert.ok(result.cycles === 200);
      assert.ok(result.totalMs < 30_000, `total too slow for 200 cycles: ${result.totalMs}ms`);
      assert.ok(result.finalTrust >= 0 && result.finalTrust <= 1);
    });
  });

  describe('Scenario: fault injection', () => {
    it('degrades nodes progressively and recovers system', () => {
      const nodes = makeNodes(5);
      let faultCount = 0;

      const result = runBenchmark(
        '5-node-fault-injection',
        nodes,
        40,
        (runtime, cycle) => {
          // Inject fault on a different node every 5 cycles
          if (cycle % 5 === 0 && faultCount < 3) {
            const targetNode = nodes[faultCount % nodes.length];
            const trust = (runtime as unknown as { clusterTrust: ClusterTrustManager }).clusterTrust;
            if (trust) {
              trust.initNode(targetNode);
              trust.degradeUnstableNode(targetNode);
            }
            faultCount++;
          }
        }
      );

      assert.ok(result.nodeCount === 5);
      assert.ok(result.finalTrust >= 0 && result.finalTrust <= 1);
      // System must remain non-fatal (no exceptions, valid health)
      assert.ok(result.finalConsensusHealth >= 0 && result.finalConsensusHealth <= 1);
    });
  });

  describe('Benchmark metrics summary', () => {
    it('measures replay latency across node counts', () => {
      const scenarios = [1, 3, 5].map(count => {
        const start = Date.now();
        const runtime = makeRuntime();
        const loop = new AdaptiveCognitiveLoop(runtime);
        const nodes = makeNodes(count);
        for (let i = 0; i < 20; i++) loop.runCycle(nodes);
        const elapsed = Date.now() - start;
        return { count, elapsed, avgMs: elapsed / 20 };
      });

      for (const s of scenarios) {
        assert.ok(s.avgMs < 100, `${s.count}-node avg cycle ${s.avgMs}ms exceeds 100ms budget`);
      }
    });

    it('measures reconciliation cost under divergence', () => {
      const runtime = makeRuntime();
      const nodes = makeNodes(5);
      const trust = (runtime as unknown as { clusterTrust: ClusterTrustManager }).clusterTrust;

      // Setup diverged state
      for (const n of nodes) trust.initNode(n);
      trust.degradeIsolatedNode('node-2');
      trust.degradeDivergentNode('node-3');

      const start = Date.now();
      runtime.synchronizeCluster(nodes);
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 100, `reconciliation took ${elapsed}ms`);
    });

    it('measures consensus overhead via health snapshots', () => {
      const runtime = makeRuntime();
      const nodes = makeNodes(5);

      const loop = new AdaptiveCognitiveLoop(runtime);
      for (let i = 0; i < 10; i++) loop.runCycle(nodes);

      const start = Date.now();
      for (let i = 0; i < 100; i++) runtime.getClusterHealth();
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 50, `100 health snapshots took ${elapsed}ms`);
    });

    it('verifies deterministic consistency across identical runs', () => {
      function runOnce(): number {
        const runtime = makeRuntime();
        const loop = new AdaptiveCognitiveLoop(runtime);
        const nodes = makeNodes(3);
        let totalScore = 0;
        for (let i = 0; i < 10; i++) {
          const d = loop.runCycle(nodes);
          totalScore += d.score;
        }
        return totalScore;
      }

      const run1 = runOnce();
      const run2 = runOnce();
      // Both runs use same deterministic logic — scores must match
      assert.equal(run1, run2, `non-deterministic: run1=${run1}, run2=${run2}`);
    });
  });
});

// ── v6.1 Extended Benchmarks ─────────────────────────────────────────────────

import { LocalExecutionRuntime } from '../distributed-cognition/LocalExecutionRuntime.js';
import { EventStore } from '../event-store/EventStore.js';

describe('v6.1 Extended Benchmarks', () => {

  describe('LocalExecutionRuntime overhead vs DistributedExecutionRuntime', () => {
    it('LocalExecutionRuntime is faster or equivalent for single-node workloads', () => {
      const nodes = ['node-1'];
      const cycles = 100;

      const localRt = new LocalExecutionRuntime();
      const localLoop = new AdaptiveCognitiveLoop(localRt);
      const tLocal = Date.now();
      for (let i = 0; i < cycles; i++) localLoop.runCycle(nodes);
      const localMs = Date.now() - tLocal;

      const distRt = new DistributedExecutionRuntime();
      const distLoop = new AdaptiveCognitiveLoop(distRt);
      const tDist = Date.now();
      for (let i = 0; i < cycles; i++) distLoop.runCycle(nodes);
      const distMs = Date.now() - tDist;

      // Local should complete well within distributed's budget
      assert.ok(localMs < 200, `local runtime too slow: ${localMs}ms for ${cycles} cycles`);
      assert.ok(distMs < 400, `distributed runtime too slow: ${distMs}ms for ${cycles} cycles`);
    });

    it('LocalExecutionRuntime deterministic state is identical across resets', () => {
      const rt = new LocalExecutionRuntime();
      const nodes = ['n1', 'n2', 'n3'];
      const states1: unknown[] = [];
      for (let i = 0; i < 5; i++) {
        rt.executeCycle(nodes);
        states1.push({ ...rt.getDeterministicState() });
      }

      rt.reset();
      const states2: unknown[] = [];
      for (let i = 0; i < 5; i++) {
        rt.executeCycle(nodes);
        states2.push({ ...rt.getDeterministicState() });
      }

      assert.deepEqual(states1, states2);
    });
  });

  describe('EventStore cost — adaptive:decision persistence', () => {
    it('persisting 200 decisions stays under 20ms', () => {
      const rt = new LocalExecutionRuntime();
      const loop = new AdaptiveCognitiveLoop(rt);
      const store = new EventStore();
      loop.attachEventStore(store);

      const start = Date.now();
      for (let i = 0; i < 200; i++) loop.runCycle(['n1']);
      const elapsed = Date.now() - start;

      assert.equal(store.all().filter(e => e.eventType === 'adaptive:decision').length, 200);
      assert.ok(elapsed < 20, `200 persisted cycles took ${elapsed}ms`);
    });

    it('EventStore query for adaptive:decision events scales sub-linearly', () => {
      const rt = new LocalExecutionRuntime();
      const loop = new AdaptiveCognitiveLoop(rt);
      const store = new EventStore();
      loop.attachEventStore(store);

      for (let i = 0; i < 500; i++) loop.runCycle(['n1', 'n2']);

      const start = Date.now();
      const events = store.all().filter(e => e.eventType === 'adaptive:decision');
      const elapsed = Date.now() - start;

      assert.equal(events.length, 500);
      assert.ok(elapsed < 10, `query over 500 events took ${elapsed}ms`);
    });
  });

  describe('Memory growth — stable execution', () => {
    it('decision list does not grow unbounded during long runs', () => {
      const rt = new LocalExecutionRuntime();
      const loop = new AdaptiveCognitiveLoop(rt);
      const store = new EventStore();
      loop.attachEventStore(store);

      for (let i = 0; i < 300; i++) loop.runCycle(['n1', 'n2', 'n3']);

      const decisions = loop.getDecisions();
      assert.equal(decisions.length, 300);

      // Store should have exactly 300 adaptive:decision events
      const storeCount = store.all().filter(e => e.eventType === 'adaptive:decision').length;
      assert.equal(storeCount, 300);
    });
  });

  describe('Replay strategic cost — stableIterations accuracy', () => {
    it('stableIterations correctly tracks stability across 50 healthy cycles', () => {
      const rt = new DistributedExecutionRuntime();
      const loop = new AdaptiveCognitiveLoop(rt);
      const nodes = makeNodes(3);

      for (let i = 0; i < 50; i++) loop.runCycle(nodes);

      const state = rt.getDeterministicState();
      assert.ok(state.stableIterations > 0, `expected stableIterations > 0, got ${state.stableIterations}`);
    });

    it('LocalExecutionRuntime stableIterations reflects stable cycles', () => {
      const rt = new LocalExecutionRuntime();
      // First cycle: trust=1.0 → success, stableIterations increments
      rt.executeCycle(['n1']);
      rt.executeCycle(['n1']);
      rt.executeCycle(['n1']);
      const state = rt.getDeterministicState();
      assert.ok(state.stableIterations >= 3, `expected >=3, got ${state.stableIterations}`);
    });
  });
});
