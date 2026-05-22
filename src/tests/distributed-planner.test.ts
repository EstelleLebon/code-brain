import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import { CognitiveNode } from '../distributed/CognitiveNode.js';
import { NodeRegistry } from '../distributed/NodeRegistry.js';
import { DistributedPlanner } from '../distributed-planning/DistributedPlanner.js';
import type { ExecutionPlan } from '../planning/PlanGenerator.js';
import { ExecutionGraph } from '../planning/ExecutionGraph.js';

function makeBus() { return new DistributedEventBus(); }
function makeNode(id: string, bus: DistributedEventBus) {
  return new CognitiveNode({
    nodeId: id,
    capabilities: { canPlan: true, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 5, supportedOperationTypes: ['default'] },
    bus,
  });
}

function makePlan(steps: Array<{ id: string; cognitiveMode: string }>): ExecutionPlan {
  return {
    id: 'plan-1',
    goals: [],
    steps: steps.map(s => ({
      id: s.id,
      goalId: 'g1',
      label: s.id,
      estimatedRisk: 0.1,
      dependencies: [],
      cognitiveMode: s.cognitiveMode,
      rollbackStrategy: 'none' as const,
    })),
    graph: new ExecutionGraph(),
    createdAt: new Date(),
    estimatedTotalRisk: 0.1,
  };
}

describe('DistributedPlanner', () => {
  it('partitionPlan groups by cognitiveMode', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([
      { id: 's1', cognitiveMode: 'analytical' },
      { id: 's2', cognitiveMode: 'analytical' },
      { id: 's3', cognitiveMode: 'surgical' },
    ]);
    const partitions = planner.partitionPlan(plan);
    assert.equal(partitions.length, 2);
  });

  it('partitionPlan empty plan returns empty', () => {
    const reg = new NodeRegistry();
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([]);
    const partitions = planner.partitionPlan(plan);
    assert.equal(partitions.length, 0);
  });

  it('assignPartitions assigns to least loaded node', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    reg.register(makeNode('n2', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const partitions = planner.partitionPlan(plan);
    const assignments = planner.assignPartitions(partitions);
    assert.equal(assignments.length, 1);
    assert.ok(['n1', 'n2'].includes(assignments[0].nodeId));
  });

  it('assignPartitions with no nodes uses unassigned', () => {
    const reg = new NodeRegistry();
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const partitions = planner.partitionPlan(plan);
    const assignments = planner.assignPartitions(partitions);
    assert.equal(assignments[0].nodeId, 'unassigned');
  });

  it('buildDistributedPlan produces valid plan', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const distPlan = planner.buildDistributedPlan(plan);
    assert.equal(distPlan.originalPlanId, 'plan-1');
    assert.ok(distPlan.partitions.length > 0);
    assert.ok(distPlan.assignments.length > 0);
    assert.ok(distPlan.criticalPath.length > 0);
  });

  it('buildDistributedPlan criticalPath has first partition', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const distPlan = planner.buildDistributedPlan(plan);
    assert.ok(distPlan.criticalPath.includes('partition-0'));
  });

  it('rebalance reassigns all partitions', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    reg.register(makeNode('n2', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const distPlan = planner.buildDistributedPlan(plan);
    const rebalanced = planner.rebalance(distPlan);
    assert.equal(rebalanced.partitions.length, distPlan.partitions.length);
    assert.equal(rebalanced.assignments.length, distPlan.assignments.length);
  });

  it('recoverPartition reassigns failed partition', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const distPlan = planner.buildDistributedPlan(plan);
    distPlan.assignments[0].status = 'failed';
    const recovered = planner.recoverPartition(distPlan, 'partition-0');
    assert.equal(recovered.assignments[0].status, 'pending');
  });

  it('partitions have estimatedCost equal to operation count', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([
      { id: 's1', cognitiveMode: 'default' },
      { id: 's2', cognitiveMode: 'default' },
    ]);
    const partitions = planner.partitionPlan(plan);
    assert.equal(partitions[0].estimatedCost, 2);
  });

  it('first partition has critical priority', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([
      { id: 's1', cognitiveMode: 'a' },
      { id: 's2', cognitiveMode: 'b' },
    ]);
    const partitions = planner.partitionPlan(plan);
    assert.equal(partitions[0].priority, 'critical');
  });

  it('assignments start in pending status', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
    const distPlan = planner.buildDistributedPlan(plan);
    assert.equal(distPlan.assignments[0].status, 'pending');
  });

  it('multiple types create multiple partitions', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const plan = makePlan([
      { id: 's1', cognitiveMode: 'a' },
      { id: 's2', cognitiveMode: 'b' },
      { id: 's3', cognitiveMode: 'c' },
    ]);
    const partitions = planner.partitionPlan(plan);
    assert.equal(partitions.length, 3);
  });
});
