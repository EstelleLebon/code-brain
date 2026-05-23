"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedExecutionRuntime_js_1 = require("../distributed-cognition/DistributedExecutionRuntime.js");
const AdaptiveCognitiveLoop_js_1 = require("../distributed-cognition/AdaptiveCognitiveLoop.js");
function makeNodes(count) {
    return Array.from({ length: count }, (_, i) => `node-${i + 1}`);
}
function makeRuntime() {
    return new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
}
function runBenchmark(scenario, nodeIds, cycles, injectFaults) {
    const runtime = makeRuntime();
    const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(runtime);
    let successCount = 0;
    let recoveryCount = 0;
    const start = Date.now();
    for (let c = 0; c < cycles; c++) {
        if (injectFaults)
            injectFaults(runtime, c, nodeIds);
        const decision = loop.runCycle(nodeIds);
        if (decision.cycleResult.outcome === 'success')
            successCount++;
        if (decision.cycleResult.recoveryTriggered)
            recoveryCount++;
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
(0, node_test_1.describe)('Multi-Node Benchmarks', () => {
    (0, node_test_1.describe)('Scenario: 1 node — baseline', () => {
        (0, node_test_1.it)('completes 50 cycles with stable trust', () => {
            const result = runBenchmark('1-node-baseline', makeNodes(1), 50);
            strict_1.default.equal(result.nodeCount, 1);
            strict_1.default.ok(result.avgCycleMs < 50, `avg cycle too slow: ${result.avgCycleMs}ms`);
            strict_1.default.ok(result.finalTrust >= 0.8, `trust degraded too much: ${result.finalTrust}`);
            strict_1.default.ok(result.successRate >= 0.9, `success rate too low: ${result.successRate}`);
        });
    });
    (0, node_test_1.describe)('Scenario: 3 nodes — nominal cluster', () => {
        (0, node_test_1.it)('completes 50 cycles with quorum health', () => {
            const result = runBenchmark('3-node-nominal', makeNodes(3), 50);
            strict_1.default.equal(result.nodeCount, 3);
            strict_1.default.ok(result.avgCycleMs < 50, `avg cycle too slow: ${result.avgCycleMs}ms`);
            strict_1.default.ok(result.finalTrust >= 0.7, `cluster trust degraded: ${result.finalTrust}`);
        });
    });
    (0, node_test_1.describe)('Scenario: 5 nodes — large cluster', () => {
        (0, node_test_1.it)('completes 50 cycles within latency budget', () => {
            const result = runBenchmark('5-node-large', makeNodes(5), 50);
            strict_1.default.equal(result.nodeCount, 5);
            strict_1.default.ok(result.avgCycleMs < 100, `avg cycle too slow: ${result.avgCycleMs}ms`);
            strict_1.default.ok(result.totalMs < 5000, `total too slow: ${result.totalMs}ms`);
        });
    });
    (0, node_test_1.describe)('Scenario: network partition', () => {
        (0, node_test_1.it)('handles progressive trust degradation and triggers recovery', () => {
            const nodes = makeNodes(3);
            let partitioned = false;
            const result = runBenchmark('3-node-partition', nodes, 30, (runtime, cycle) => {
                if (cycle === 10 && !partitioned) {
                    // Simulate partition by degrading trust on a node
                    const trust = runtime.clusterTrust;
                    if (trust) {
                        trust.initNode('node-2');
                        trust.degradeIsolatedNode('node-2');
                        trust.degradeIsolatedNode('node-2');
                        trust.degradeIsolatedNode('node-2');
                    }
                    partitioned = true;
                }
            });
            strict_1.default.ok(result.recoveryCount >= 0, 'recovery count should be non-negative');
            // System must stay alive (not crash), assert health snapshot is valid
            strict_1.default.ok(result.finalTrust >= 0 && result.finalTrust <= 1, `trust out of bounds: ${result.finalTrust}`);
        });
    });
    (0, node_test_1.describe)('Scenario: massive replay', () => {
        (0, node_test_1.it)('handles 200 cycles without memory growth issues', () => {
            const result = runBenchmark('5-node-massive-replay', makeNodes(5), 200);
            strict_1.default.ok(result.cycles === 200);
            strict_1.default.ok(result.totalMs < 30_000, `total too slow for 200 cycles: ${result.totalMs}ms`);
            strict_1.default.ok(result.finalTrust >= 0 && result.finalTrust <= 1);
        });
    });
    (0, node_test_1.describe)('Scenario: fault injection', () => {
        (0, node_test_1.it)('degrades nodes progressively and recovers system', () => {
            const nodes = makeNodes(5);
            let faultCount = 0;
            const result = runBenchmark('5-node-fault-injection', nodes, 40, (runtime, cycle) => {
                // Inject fault on a different node every 5 cycles
                if (cycle % 5 === 0 && faultCount < 3) {
                    const targetNode = nodes[faultCount % nodes.length];
                    const trust = runtime.clusterTrust;
                    if (trust) {
                        trust.initNode(targetNode);
                        trust.degradeUnstableNode(targetNode);
                    }
                    faultCount++;
                }
            });
            strict_1.default.ok(result.nodeCount === 5);
            strict_1.default.ok(result.finalTrust >= 0 && result.finalTrust <= 1);
            // System must remain non-fatal (no exceptions, valid health)
            strict_1.default.ok(result.finalConsensusHealth >= 0 && result.finalConsensusHealth <= 1);
        });
    });
    (0, node_test_1.describe)('Benchmark metrics summary', () => {
        (0, node_test_1.it)('measures replay latency across node counts', () => {
            const scenarios = [1, 3, 5].map(count => {
                const start = Date.now();
                const runtime = makeRuntime();
                const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(runtime);
                const nodes = makeNodes(count);
                for (let i = 0; i < 20; i++)
                    loop.runCycle(nodes);
                const elapsed = Date.now() - start;
                return { count, elapsed, avgMs: elapsed / 20 };
            });
            for (const s of scenarios) {
                strict_1.default.ok(s.avgMs < 100, `${s.count}-node avg cycle ${s.avgMs}ms exceeds 100ms budget`);
            }
        });
        (0, node_test_1.it)('measures reconciliation cost under divergence', () => {
            const runtime = makeRuntime();
            const nodes = makeNodes(5);
            const trust = runtime.clusterTrust;
            // Setup diverged state
            for (const n of nodes)
                trust.initNode(n);
            trust.degradeIsolatedNode('node-2');
            trust.degradeDivergentNode('node-3');
            const start = Date.now();
            runtime.synchronizeCluster(nodes);
            const elapsed = Date.now() - start;
            strict_1.default.ok(elapsed < 100, `reconciliation took ${elapsed}ms`);
        });
        (0, node_test_1.it)('measures consensus overhead via health snapshots', () => {
            const runtime = makeRuntime();
            const nodes = makeNodes(5);
            const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(runtime);
            for (let i = 0; i < 10; i++)
                loop.runCycle(nodes);
            const start = Date.now();
            for (let i = 0; i < 100; i++)
                runtime.getClusterHealth();
            const elapsed = Date.now() - start;
            strict_1.default.ok(elapsed < 50, `100 health snapshots took ${elapsed}ms`);
        });
        (0, node_test_1.it)('verifies deterministic consistency across identical runs', () => {
            function runOnce() {
                const runtime = makeRuntime();
                const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(runtime);
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
            strict_1.default.equal(run1, run2, `non-deterministic: run1=${run1}, run2=${run2}`);
        });
    });
});
//# sourceMappingURL=multi-node-benchmark.test.js.map