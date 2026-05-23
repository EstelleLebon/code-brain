"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ChaosEngine_js_1 = require("../chaos-engineering/ChaosEngine.js");
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
const NetworkPartitionSimulator_js_1 = require("../network-simulation/NetworkPartitionSimulator.js");
const DistributedEventBus_js_1 = require("../distributed/DistributedEventBus.js");
const NodeRegistry_js_1 = require("../distributed/NodeRegistry.js");
const CognitiveNode_js_1 = require("../distributed/CognitiveNode.js");
function makeChaosEngine() {
    return new ChaosEngine_js_1.ChaosEngine(new FaultInjection_js_1.FaultInjector(), 'SAFE');
}
(0, node_test_1.describe)('ChaosEngine network scenarios', () => {
    (0, node_test_1.it)('injectPartition() returns NetworkScenarioResult', () => {
        const engine = makeChaosEngine();
        const result = engine.injectPartition(['n1', 'n2'], 42);
        strict_1.default.equal(result.type, 'partition');
        strict_1.default.ok(result.scenarioId.includes('partition'));
        strict_1.default.deepEqual(result.affectedNodes, ['n1', 'n2']);
        strict_1.default.equal(result.partitionsCreated, 1);
    });
    (0, node_test_1.it)('injectPartition() is deterministic for same seed', () => {
        const e1 = makeChaosEngine();
        const e2 = makeChaosEngine();
        const r1 = e1.injectPartition(['n1', 'n2'], 12345);
        const r2 = e2.injectPartition(['n1', 'n2'], 12345);
        strict_1.default.equal(r1.messagesDropped, r2.messagesDropped);
        strict_1.default.equal(r1.deterministicSeed, r2.deterministicSeed);
    });
    (0, node_test_1.it)('healPartition() removes from activeScenarios', () => {
        const engine = makeChaosEngine();
        const result = engine.injectPartition(['n1'], 1);
        strict_1.default.equal(engine.activeScenarios.size, 1);
        engine.healPartition(result.scenarioId);
        strict_1.default.equal(engine.activeScenarios.size, 0);
    });
    (0, node_test_1.it)('isolateLeader() returns result with affectedNodes', () => {
        const engine = makeChaosEngine();
        const result = engine.isolateLeader('leader-1', 99);
        strict_1.default.equal(result.type, 'leader_isolation');
        strict_1.default.deepEqual(result.affectedNodes, ['leader-1']);
    });
    (0, node_test_1.it)('degradeConsensus() returns result with valid metrics', () => {
        const engine = makeChaosEngine();
        const result = engine.degradeConsensus(0.8, 7);
        strict_1.default.equal(result.type, 'quorum_loss');
        strict_1.default.ok(result.messagesDropped >= 0);
        strict_1.default.equal(result.deterministicSeed, 7);
    });
    (0, node_test_1.it)('randomizeDeliveryOrder() does not throw', () => {
        const engine = makeChaosEngine();
        strict_1.default.doesNotThrow(() => engine.randomizeDeliveryOrder(77));
        strict_1.default.equal(engine.activeScenarios.size, 1);
    });
    (0, node_test_1.it)('injectSplitBrain() returns result with 2 affected groups', () => {
        const engine = makeChaosEngine();
        const result = engine.injectSplitBrain(['n1', 'n2'], ['n3', 'n4'], 55);
        strict_1.default.equal(result.type, 'split_brain');
        strict_1.default.equal(result.partitionsCreated, 2);
        strict_1.default.equal(result.affectedNodes.length, 4);
    });
    (0, node_test_1.it)('activeScenarios getter returns current scenarios', () => {
        const engine = makeChaosEngine();
        engine.injectPartition(['n1'], 1);
        engine.injectPartition(['n2'], 2);
        strict_1.default.equal(engine.activeScenarios.size, 2);
    });
});
(0, node_test_1.describe)('NetworkPartitionSimulator', () => {
    function makeSimulator() {
        const bus = new DistributedEventBus_js_1.DistributedEventBus();
        const registry = new NodeRegistry_js_1.NodeRegistry();
        const caps = { canPlan: true, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 3, supportedOperationTypes: ['default'] };
        registry.register(new CognitiveNode_js_1.CognitiveNode({ nodeId: 'n1', capabilities: caps, bus }));
        registry.register(new CognitiveNode_js_1.CognitiveNode({ nodeId: 'n2', capabilities: caps, bus }));
        registry.register(new CognitiveNode_js_1.CognitiveNode({ nodeId: 'n3', capabilities: caps, bus }));
        return new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, registry);
    }
    (0, node_test_1.it)('createSplitBrain() returns partitionId string', () => {
        const sim = makeSimulator();
        const pid = sim.createSplitBrain(['n1'], ['n2'], 42);
        strict_1.default.ok(typeof pid === 'string');
        strict_1.default.ok(pid.length > 0);
    });
    (0, node_test_1.it)('simulateQuorumLoss() returns boolean', () => {
        const sim = makeSimulator();
        const result = sim.simulateQuorumLoss(['n1', 'n2', 'n3'], 2, 42);
        strict_1.default.ok(typeof result === 'boolean');
    });
    (0, node_test_1.it)('getActivePartitionIds() returns array', () => {
        const sim = makeSimulator();
        sim.createSplitBrain(['n1'], ['n2'], 1);
        const ids = sim.getActivePartitionIds();
        strict_1.default.ok(Array.isArray(ids));
        strict_1.default.ok(ids.length >= 2); // split brain creates 2 partition entries
    });
});
(0, node_test_1.describe)('FaultInjector network faults', () => {
    (0, node_test_1.it)('injectNetworkFault() stores fault', () => {
        const injector = new FaultInjection_js_1.FaultInjector();
        injector.injectNetworkFault('drop', 'n1', 0.5, 42);
        const faults = injector.getInjectedFaults();
        strict_1.default.equal(faults.length, 1);
        strict_1.default.equal(faults[0].type, 'drop');
        strict_1.default.equal(faults[0].nodeId, 'n1');
    });
    (0, node_test_1.it)('getInjectedFaults() returns stored faults', () => {
        const injector = new FaultInjection_js_1.FaultInjector();
        injector.injectNetworkFault('drop', 'n1', 0.5);
        injector.injectNetworkFault('duplicate', 'n2', 0.3);
        const faults = injector.getInjectedFaults();
        strict_1.default.equal(faults.length, 2);
    });
    (0, node_test_1.it)('clearFaults() empties faults', () => {
        const injector = new FaultInjection_js_1.FaultInjector();
        injector.injectNetworkFault('drop', 'n1', 0.5);
        injector.clearFaults();
        const faults = injector.getInjectedFaults();
        strict_1.default.equal(faults.length, 0);
    });
});
//# sourceMappingURL=chaos-network.test.js.map