import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import { CognitiveNode } from '../distributed/CognitiveNode.js';
import { NodeRegistry } from '../distributed/NodeRegistry.js';
import { NetworkPartitionSimulator } from '../network-simulation/NetworkPartitionSimulator.js';
import { DeliveryScheduler } from '../network-simulation/DeliveryScheduler.js';

function makeBus() { return new DistributedEventBus(); }

function makeNode(id: string, bus: DistributedEventBus) {
  return new CognitiveNode({
    nodeId: id,
    capabilities: { canPlan: false, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 3, supportedOperationTypes: ['default'] },
    bus,
  });
}

describe('NetworkPartitionSimulator', () => {
  it('partitionNode isolates the node', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const sim = new NetworkPartitionSimulator(bus, reg);
    sim.partitionNode('n1');
    assert.ok(sim.isNodeIsolated('n1'));
  });

  it('partitionNode returns partition id', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const sim = new NetworkPartitionSimulator(bus, reg);
    const pid = sim.partitionNode('n1');
    assert.ok(typeof pid === 'string');
  });

  it('healPartition restores node', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const sim = new NetworkPartitionSimulator(bus, reg);
    const pid = sim.partitionNode('n1');
    sim.healPartition(pid);
    assert.ok(!sim.isNodeIsolated('n1'));
  });

  it('simulateSplitBrain creates two partition groups', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    ['n1', 'n2', 'n3', 'n4'].forEach(id => reg.register(makeNode(id, bus)));
    const sim = new NetworkPartitionSimulator(bus, reg);
    const { partitionA, partitionB } = sim.simulateSplitBrain(['n1', 'n2', 'n3', 'n4']);
    assert.ok(partitionA !== partitionB);
    assert.equal(sim.getActivePartitions().size, 2);
  });

  it('injectLatency records event', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    const sim = new NetworkPartitionSimulator(bus, reg);
    sim.injectLatency('n1', 5);
    assert.equal(sim.getEvents().length, 1);
    assert.equal(sim.getEvents()[0].condition, 'latency');
  });

  it('dropMessages affects shouldDropMessage with rate 1.0', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    const sim = new NetworkPartitionSimulator(bus, reg, 12345);
    sim.dropMessages('n1', 1.0);
    assert.ok(sim.shouldDropMessage('n1'));
  });

  it('shouldDropMessage returns false with rate 0', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    const sim = new NetworkPartitionSimulator(bus, reg);
    sim.dropMessages('n1', 0);
    assert.ok(!sim.shouldDropMessage('n1'));
  });

  it('getActivePartitions returns current partitions', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const sim = new NetworkPartitionSimulator(bus, reg);
    sim.partitionNode('n1', 'p-test');
    assert.ok(sim.getActivePartitions().has('p-test'));
  });

  it('deterministic with same seed', () => {
    const bus1 = makeBus(); const reg1 = new NodeRegistry();
    const bus2 = makeBus(); const reg2 = new NodeRegistry();
    const sim1 = new NetworkPartitionSimulator(bus1, reg1, 999);
    const sim2 = new NetworkPartitionSimulator(bus2, reg2, 999);
    sim1.dropMessages('n1', 0.5);
    sim2.dropMessages('n1', 0.5);
    const r1 = sim1.shouldDropMessage('n1');
    const r2 = sim2.shouldDropMessage('n1');
    assert.equal(r1, r2);
  });

  it('getEvents grows with each simulation action', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const sim = new NetworkPartitionSimulator(bus, reg);
    sim.injectLatency('n1', 3);
    sim.dropMessages('n1', 0.1);
    assert.equal(sim.getEvents().length, 2);
  });
});

describe('DeliveryScheduler', () => {
  it('schedule returns message', () => {
    const sched = new DeliveryScheduler();
    const msg = sched.schedule('payload', 'n1', 'n2', 2);
    assert.ok(msg.messageId.startsWith('msg-'));
    assert.equal(msg.delivered, false);
  });

  it('tick delivers due messages', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('payload', 'n1', 'n2', 1);
    const delivered = sched.tick(); // clock becomes 1
    assert.equal(delivered.length, 1);
    assert.ok(delivered[0].delivered);
  });

  it('tick does not deliver messages not yet due', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('payload', 'n1', 'n2', 5);
    const delivered = sched.tick();
    assert.equal(delivered.length, 0);
  });

  it('getPending returns undelivered messages sorted by deliverAt', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('a', 'n1', 'n2', 3);
    sched.schedule('b', 'n1', 'n2', 1);
    const pending = sched.getPending();
    assert.equal(pending[0].deliverAt, 1);
  });

  it('stable ordering: messages sorted by messageId on same tick', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('a', 'n1', 'n2', 1);
    sched.schedule('b', 'n1', 'n2', 1);
    const delivered = sched.tick();
    assert.equal(delivered.length, 2);
    assert.ok(delivered[0].messageId <= delivered[1].messageId);
  });

  it('scheduleWithJitter adds jitter deterministically', () => {
    const sched1 = new DeliveryScheduler(42);
    const sched2 = new DeliveryScheduler(42);
    const m1 = sched1.scheduleWithJitter('x', 'n1', 'n2', 5, 10);
    const m2 = sched2.scheduleWithJitter('x', 'n1', 'n2', 5, 10);
    assert.equal(m1.deliverAt, m2.deliverAt);
  });

  it('getClock advances with each tick', () => {
    const sched = new DeliveryScheduler();
    sched.tick();
    sched.tick();
    assert.equal(sched.getClock(), 2);
  });

  it('getAllMessages returns all including delivered', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('x', 'n1', 'n2', 1);
    sched.tick();
    assert.equal(sched.getAllMessages().length, 1);
    assert.ok(sched.getAllMessages()[0].delivered);
  });

  it('immediate delivery (delay=0)', () => {
    const sched = new DeliveryScheduler();
    sched.schedule('x', 'n1', 'n2', 0);
    const delivered = sched.tick(); // clock=1, deliverAt=0 so due
    assert.equal(delivered.length, 1);
  });
});
