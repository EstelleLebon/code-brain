"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedEventBus_js_1 = require("../distributed/DistributedEventBus.js");
const CognitiveNode_js_1 = require("../distributed/CognitiveNode.js");
const NodeRegistry_js_1 = require("../distributed/NodeRegistry.js");
const NetworkPartitionSimulator_js_1 = require("../network-simulation/NetworkPartitionSimulator.js");
const DeliveryScheduler_js_1 = require("../network-simulation/DeliveryScheduler.js");
function makeBus() { return new DistributedEventBus_js_1.DistributedEventBus(); }
function makeNode(id, bus) {
    return new CognitiveNode_js_1.CognitiveNode({
        nodeId: id,
        capabilities: { canPlan: false, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 3, supportedOperationTypes: ['default'] },
        bus,
    });
}
(0, node_test_1.describe)('NetworkPartitionSimulator', () => {
    (0, node_test_1.it)('partitionNode isolates the node', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        sim.partitionNode('n1');
        strict_1.default.ok(sim.isNodeIsolated('n1'));
    });
    (0, node_test_1.it)('partitionNode returns partition id', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        const pid = sim.partitionNode('n1');
        strict_1.default.ok(typeof pid === 'string');
    });
    (0, node_test_1.it)('healPartition restores node', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        const pid = sim.partitionNode('n1');
        sim.healPartition(pid);
        strict_1.default.ok(!sim.isNodeIsolated('n1'));
    });
    (0, node_test_1.it)('simulateSplitBrain creates two partition groups', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        ['n1', 'n2', 'n3', 'n4'].forEach(id => reg.register(makeNode(id, bus)));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        const { partitionA, partitionB } = sim.simulateSplitBrain(['n1', 'n2', 'n3', 'n4']);
        strict_1.default.ok(partitionA !== partitionB);
        strict_1.default.equal(sim.getActivePartitions().size, 2);
    });
    (0, node_test_1.it)('injectLatency records event', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        sim.injectLatency('n1', 5);
        strict_1.default.equal(sim.getEvents().length, 1);
        strict_1.default.equal(sim.getEvents()[0].condition, 'latency');
    });
    (0, node_test_1.it)('dropMessages affects shouldDropMessage with rate 1.0', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg, 12345);
        sim.dropMessages('n1', 1.0);
        strict_1.default.ok(sim.shouldDropMessage('n1'));
    });
    (0, node_test_1.it)('shouldDropMessage returns false with rate 0', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        sim.dropMessages('n1', 0);
        strict_1.default.ok(!sim.shouldDropMessage('n1'));
    });
    (0, node_test_1.it)('getActivePartitions returns current partitions', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        sim.partitionNode('n1', 'p-test');
        strict_1.default.ok(sim.getActivePartitions().has('p-test'));
    });
    (0, node_test_1.it)('deterministic with same seed', () => {
        const bus1 = makeBus();
        const reg1 = new NodeRegistry_js_1.NodeRegistry();
        const bus2 = makeBus();
        const reg2 = new NodeRegistry_js_1.NodeRegistry();
        const sim1 = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus1, reg1, 999);
        const sim2 = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus2, reg2, 999);
        sim1.dropMessages('n1', 0.5);
        sim2.dropMessages('n1', 0.5);
        const r1 = sim1.shouldDropMessage('n1');
        const r2 = sim2.shouldDropMessage('n1');
        strict_1.default.equal(r1, r2);
    });
    (0, node_test_1.it)('getEvents grows with each simulation action', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const sim = new NetworkPartitionSimulator_js_1.NetworkPartitionSimulator(bus, reg);
        sim.injectLatency('n1', 3);
        sim.dropMessages('n1', 0.1);
        strict_1.default.equal(sim.getEvents().length, 2);
    });
});
(0, node_test_1.describe)('DeliveryScheduler', () => {
    (0, node_test_1.it)('schedule returns message', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        const msg = sched.schedule('payload', 'n1', 'n2', 2);
        strict_1.default.ok(msg.messageId.startsWith('msg-'));
        strict_1.default.equal(msg.delivered, false);
    });
    (0, node_test_1.it)('tick delivers due messages', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('payload', 'n1', 'n2', 1);
        const delivered = sched.tick(); // clock becomes 1
        strict_1.default.equal(delivered.length, 1);
        strict_1.default.ok(delivered[0].delivered);
    });
    (0, node_test_1.it)('tick does not deliver messages not yet due', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('payload', 'n1', 'n2', 5);
        const delivered = sched.tick();
        strict_1.default.equal(delivered.length, 0);
    });
    (0, node_test_1.it)('getPending returns undelivered messages sorted by deliverAt', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('a', 'n1', 'n2', 3);
        sched.schedule('b', 'n1', 'n2', 1);
        const pending = sched.getPending();
        strict_1.default.equal(pending[0].deliverAt, 1);
    });
    (0, node_test_1.it)('stable ordering: messages sorted by messageId on same tick', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('a', 'n1', 'n2', 1);
        sched.schedule('b', 'n1', 'n2', 1);
        const delivered = sched.tick();
        strict_1.default.equal(delivered.length, 2);
        strict_1.default.ok(delivered[0].messageId <= delivered[1].messageId);
    });
    (0, node_test_1.it)('scheduleWithJitter adds jitter deterministically', () => {
        const sched1 = new DeliveryScheduler_js_1.DeliveryScheduler(42);
        const sched2 = new DeliveryScheduler_js_1.DeliveryScheduler(42);
        const m1 = sched1.scheduleWithJitter('x', 'n1', 'n2', 5, 10);
        const m2 = sched2.scheduleWithJitter('x', 'n1', 'n2', 5, 10);
        strict_1.default.equal(m1.deliverAt, m2.deliverAt);
    });
    (0, node_test_1.it)('getClock advances with each tick', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.tick();
        sched.tick();
        strict_1.default.equal(sched.getClock(), 2);
    });
    (0, node_test_1.it)('getAllMessages returns all including delivered', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('x', 'n1', 'n2', 1);
        sched.tick();
        strict_1.default.equal(sched.getAllMessages().length, 1);
        strict_1.default.ok(sched.getAllMessages()[0].delivered);
    });
    (0, node_test_1.it)('immediate delivery (delay=0)', () => {
        const sched = new DeliveryScheduler_js_1.DeliveryScheduler();
        sched.schedule('x', 'n1', 'n2', 0);
        const delivered = sched.tick(); // clock=1, deliverAt=0 so due
        strict_1.default.equal(delivered.length, 1);
    });
});
//# sourceMappingURL=network-simulation.test.js.map