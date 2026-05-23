"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const AdaptiveCognitiveLoop_js_1 = require("../distributed-cognition/AdaptiveCognitiveLoop.js");
const DistributedExecutionRuntime_js_1 = require("../distributed-cognition/DistributedExecutionRuntime.js");
// ── Minimal stub runtime for unit testing ────────────────────────────────────
function makeStubRuntime(overrides = {}) {
    let counter = 0;
    return {
        executeCycle(_nodeIds) {
            counter++;
            return {
                executionId: `exec-${counter}`,
                iteration: counter,
                outcome: 'success',
                affectedNodes: [],
                recoveryTriggered: false,
            };
        },
        recoverNode() { return true; },
        synchronizeCluster() { },
        getClusterHealth() {
            return { globalTrust: 1.0, consensusHealth: 1.0, activeRecoveryPlans: 0, unstableNodeCount: 0, quarantinedNodeCount: 0 };
        },
        getDeterministicState() {
            return { logicalClock: counter, iteration: counter, aggression: 0.7, stableIterations: 0, rebalancePending: false };
        },
        reset() { counter = 0; },
        ...overrides,
    };
}
(0, node_test_1.describe)('AdaptiveCognitiveLoop', () => {
    (0, node_test_1.it)('starts with balanced strategy', () => {
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(makeStubRuntime());
        strict_1.default.equal(loop.currentStrategy(), 'balanced');
    });
    (0, node_test_1.it)('runCycle returns a valid decision', () => {
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(makeStubRuntime());
        const decision = loop.runCycle(['n1', 'n2']);
        strict_1.default.equal(decision.iteration, 1);
        strict_1.default.ok(['aggressive', 'balanced', 'conservative', 'recovery'].includes(decision.strategy));
        strict_1.default.ok(decision.score >= 0 && decision.score <= 100);
        strict_1.default.ok(decision.adaptationReason.length > 0);
    });
    (0, node_test_1.it)('increments iteration on each runCycle', () => {
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(makeStubRuntime());
        loop.runCycle(['n1']);
        loop.runCycle(['n1']);
        const d = loop.runCycle(['n1']);
        strict_1.default.equal(d.iteration, 3);
    });
    (0, node_test_1.it)('averageScore tracks score history', () => {
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(makeStubRuntime());
        loop.runCycle(['n1']);
        loop.runCycle(['n1']);
        const avg = loop.averageScore();
        strict_1.default.ok(avg >= 0 && avg <= 100);
    });
    (0, node_test_1.it)('escalates to recovery strategy under critical trust', () => {
        let callCount = 0;
        const stub = makeStubRuntime({
            executeCycle() {
                callCount++;
                return { executionId: `e-${callCount}`, iteration: callCount, outcome: 'failure', affectedNodes: ['n1'], recoveryTriggered: false };
            },
            getClusterHealth() {
                return { globalTrust: 0.1, consensusHealth: 0.1, activeRecoveryPlans: 0, unstableNodeCount: 1, quarantinedNodeCount: 0 };
            },
        });
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(stub);
        // Run enough failures to cross threshold
        for (let i = 0; i < 4; i++)
            loop.runCycle(['n1']);
        strict_1.default.equal(loop.currentStrategy(), 'recovery');
    });
    (0, node_test_1.it)('escalates to conservative under degraded trust', () => {
        const stub = makeStubRuntime({
            executeCycle() {
                return { executionId: 'e1', iteration: 1, outcome: 'degraded', affectedNodes: [], recoveryTriggered: false };
            },
            getClusterHealth() {
                return { globalTrust: 0.4, consensusHealth: 0.4, activeRecoveryPlans: 0, unstableNodeCount: 0, quarantinedNodeCount: 0 };
            },
        });
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(stub);
        loop.runCycle(['n1']);
        strict_1.default.equal(loop.currentStrategy(), 'conservative');
    });
    (0, node_test_1.it)('reset clears all state', () => {
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(makeStubRuntime());
        loop.runCycle(['n1']);
        loop.runCycle(['n1']);
        loop.reset();
        strict_1.default.equal(loop.averageScore(), 0);
        strict_1.default.equal(loop.getDecisions().length, 0);
        strict_1.default.equal(loop.currentStrategy(), 'balanced');
    });
    (0, node_test_1.it)('recoverNode delegates to runtime', () => {
        let called = false;
        const stub = makeStubRuntime({
            recoverNode() { called = true; return true; },
        });
        const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(stub);
        const ok = loop.recoverNode('n1');
        strict_1.default.ok(called);
        strict_1.default.ok(ok);
    });
});
(0, node_test_1.describe)('DistributedExecutionRuntime', () => {
    (0, node_test_1.it)('executeCycle returns valid CycleResult', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        const result = runtime.executeCycle(['n1', 'n2', 'n3']);
        strict_1.default.ok(result.executionId.startsWith('exec-'));
        strict_1.default.ok(['success', 'failure', 'timeout', 'partition', 'degraded'].includes(result.outcome));
        strict_1.default.ok(Array.isArray(result.affectedNodes));
    });
    (0, node_test_1.it)('getClusterHealth returns bounded values', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        runtime.executeCycle(['n1']);
        const health = runtime.getClusterHealth();
        strict_1.default.ok(health.globalTrust >= 0 && health.globalTrust <= 1);
        strict_1.default.ok(health.consensusHealth >= 0 && health.consensusHealth <= 1);
        strict_1.default.ok(health.unstableNodeCount >= 0);
        strict_1.default.ok(health.quarantinedNodeCount >= 0);
    });
    (0, node_test_1.it)('getDeterministicState returns bounded values', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        runtime.executeCycle(['n1']);
        const state = runtime.getDeterministicState();
        strict_1.default.ok(state.aggression >= 0 && state.aggression <= 1);
        strict_1.default.ok(state.iteration >= 0);
        strict_1.default.ok(state.logicalClock >= 0);
    });
    (0, node_test_1.it)('recoverNode returns boolean without throwing', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        const ok = runtime.recoverNode('n1', 'test recovery');
        strict_1.default.ok(typeof ok === 'boolean');
    });
    (0, node_test_1.it)('synchronizeCluster does not throw', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        strict_1.default.doesNotThrow(() => runtime.synchronizeCluster(['n1', 'n2', 'n3']));
    });
    (0, node_test_1.it)('reset restores initial state', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        for (let i = 0; i < 5; i++)
            runtime.executeCycle(['n1', 'n2']);
        runtime.reset();
        const state = runtime.getDeterministicState();
        strict_1.default.equal(state.logicalClock, 0);
        strict_1.default.equal(state.iteration, 0);
    });
    (0, node_test_1.it)('produces deterministic scores for identical inputs', () => {
        function runSequence() {
            const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
            const loop = new AdaptiveCognitiveLoop_js_1.AdaptiveCognitiveLoop(runtime);
            return Array.from({ length: 5 }, () => loop.runCycle(['n1', 'n2']).score);
        }
        const a = runSequence();
        const b = runSequence();
        strict_1.default.deepEqual(a, b);
    });
});
(0, node_test_1.describe)('CognitiveExecutionRuntime — contract tests', () => {
    (0, node_test_1.it)('DistributedExecutionRuntime satisfies CognitiveExecutionRuntime contract', () => {
        const runtime = new DistributedExecutionRuntime_js_1.DistributedExecutionRuntime();
        strict_1.default.ok(typeof runtime.executeCycle === 'function');
        strict_1.default.ok(typeof runtime.recoverNode === 'function');
        strict_1.default.ok(typeof runtime.synchronizeCluster === 'function');
        strict_1.default.ok(typeof runtime.getClusterHealth === 'function');
        strict_1.default.ok(typeof runtime.getDeterministicState === 'function');
        strict_1.default.ok(typeof runtime.reset === 'function');
    });
});
//# sourceMappingURL=adaptive-cognitive-loop.test.js.map