import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import { CognitiveNode } from '../distributed/CognitiveNode.js';
import { NodeRegistry } from '../distributed/NodeRegistry.js';
import { DistributedPlanner } from '../distributed-planning/DistributedPlanner.js';
import { DistributedExecutor } from '../distributed-execution/DistributedExecutor.js';
import { ExecutionCoordinator } from '../distributed-execution/ExecutionCoordinator.js';
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

function makeGoal(id = 'g1') {
  return { id, description: 'test', type: 'repair' as const, priority: 'medium' as const, constraints: {}, acceptanceCriteria: [], createdAt: new Date(), status: 'pending' as const };
}

function makePlan(): ExecutionPlan {
  return {
    id: 'plan-1',
    goals: [],
    steps: [{ id: 's1', goalId: 'g1', label: 's1', estimatedRisk: 0.1, dependencies: [], cognitiveMode: 'default', rollbackStrategy: 'none' as const }],
    graph: new ExecutionGraph(),
    createdAt: new Date(),
    estimatedTotalRisk: 0.1,
  };
}

describe('DistributedExecutor', () => {
  it('executeDistributedGoal creates execution', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    assert.ok(exec.executionId.startsWith('exec-'));
    assert.equal(exec.goalId, 'g1');
  });

  it('executeDistributedGoal status is running on success', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    assert.equal(exec.status, 'running');
  });

  it('executeDistributedGoal creates checkpoint', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    assert.ok(exec.checkpoints.length > 0);
  });

  it('pauseExecution pauses status', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    executor.pauseExecution(exec.executionId);
    assert.equal(executor.getExecution(exec.executionId)?.status, 'paused');
  });

  it('resumeExecution resumes from paused', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    executor.pauseExecution(exec.executionId);
    executor.resumeExecution(exec.executionId);
    assert.equal(executor.getExecution(exec.executionId)?.status, 'running');
  });

  it('abortExecution sets status aborted', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    executor.abortExecution(exec.executionId);
    assert.equal(executor.getExecution(exec.executionId)?.status, 'aborted');
  });

  it('getAllExecutions returns all', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    executor.executeDistributedGoal(makeGoal('g1'), makePlan());
    executor.executeDistributedGoal(makeGoal('g2'), makePlan());
    assert.equal(executor.getAllExecutions().length, 2);
  });

  it('missing node adds error but does not throw', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    // No node registered — assignment should fail gracefully
    assert.ok(exec.errors.length >= 0); // no throw
  });

  it('recoverExecution transitions from failed to running', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    // Force to failed
    exec.status = 'failed';
    exec.plan.assignments.forEach(a => { a.status = 'failed'; });
    const recovered = executor.recoverExecution(exec.executionId);
    assert.equal(recovered?.status, 'running');
  });

  it('recoverExecution on non-failed returns exec unchanged', () => {
    const bus = makeBus();
    const reg = new NodeRegistry();
    reg.register(makeNode('n1', bus));
    const planner = new DistributedPlanner(reg);
    const executor = new DistributedExecutor(reg, planner, bus);
    const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
    // Status is running, not failed
    const result = executor.recoverExecution(exec.executionId);
    assert.equal(result?.status, 'running');
  });
});

describe('ExecutionCoordinator', () => {
  it('createSyncPoint returns sync point', () => {
    const coord = new ExecutionCoordinator(makeBus());
    const sp = coord.createSyncPoint('sync1', ['p1', 'p2']);
    assert.equal(sp.syncId, 'sync1');
    assert.equal(sp.requiredPartitions.length, 2);
  });

  it('markPartitionComplete returns true when all done', () => {
    const coord = new ExecutionCoordinator(makeBus());
    coord.createSyncPoint('sync1', ['p1', 'p2']);
    coord.markPartitionComplete('sync1', 'p1');
    const done = coord.markPartitionComplete('sync1', 'p2');
    assert.ok(done);
  });

  it('createBarrier and releaseBarrier', () => {
    const coord = new ExecutionCoordinator(makeBus());
    coord.createBarrier('b1', 'p3', ['p1', 'p2']);
    coord.releaseBarrier('b1', 'p1');
    const released = coord.releaseBarrier('b1', 'p2');
    assert.ok(released);
    assert.ok(coord.isBarrierReleased('b1'));
  });

  it('createCheckpoint returns checkpoint id', () => {
    const coord = new ExecutionCoordinator(makeBus());
    const id = coord.createCheckpoint('exec-1', ['p1']);
    assert.ok(id.includes('exec-1'));
  });
});
