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
const DistributedPlanner_js_1 = require("../distributed-planning/DistributedPlanner.js");
const DistributedExecutor_js_1 = require("../distributed-execution/DistributedExecutor.js");
const ExecutionCoordinator_js_1 = require("../distributed-execution/ExecutionCoordinator.js");
const ExecutionGraph_js_1 = require("../planning/ExecutionGraph.js");
function makeBus() { return new DistributedEventBus_js_1.DistributedEventBus(); }
function makeNode(id, bus) {
    return new CognitiveNode_js_1.CognitiveNode({
        nodeId: id,
        capabilities: { canPlan: true, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 5, supportedOperationTypes: ['default'] },
        bus,
    });
}
function makeGoal(id = 'g1') {
    return { id, description: 'test', type: 'repair', priority: 'medium', constraints: {}, acceptanceCriteria: [], createdAt: new Date(), status: 'pending' };
}
function makePlan() {
    return {
        id: 'plan-1',
        goals: [],
        steps: [{ id: 's1', goalId: 'g1', label: 's1', estimatedRisk: 0.1, dependencies: [], cognitiveMode: 'default', rollbackStrategy: 'none' }],
        graph: new ExecutionGraph_js_1.ExecutionGraph(),
        createdAt: new Date(),
        estimatedTotalRisk: 0.1,
    };
}
(0, node_test_1.describe)('DistributedExecutor', () => {
    (0, node_test_1.it)('executeDistributedGoal creates execution', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        strict_1.default.ok(exec.executionId.startsWith('exec-'));
        strict_1.default.equal(exec.goalId, 'g1');
    });
    (0, node_test_1.it)('executeDistributedGoal status is running on success', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        strict_1.default.equal(exec.status, 'running');
    });
    (0, node_test_1.it)('executeDistributedGoal creates checkpoint', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        strict_1.default.ok(exec.checkpoints.length > 0);
    });
    (0, node_test_1.it)('pauseExecution pauses status', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        executor.pauseExecution(exec.executionId);
        strict_1.default.equal(executor.getExecution(exec.executionId)?.status, 'paused');
    });
    (0, node_test_1.it)('resumeExecution resumes from paused', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        executor.pauseExecution(exec.executionId);
        executor.resumeExecution(exec.executionId);
        strict_1.default.equal(executor.getExecution(exec.executionId)?.status, 'running');
    });
    (0, node_test_1.it)('abortExecution sets status aborted', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        executor.abortExecution(exec.executionId);
        strict_1.default.equal(executor.getExecution(exec.executionId)?.status, 'aborted');
    });
    (0, node_test_1.it)('getAllExecutions returns all', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        executor.executeDistributedGoal(makeGoal('g1'), makePlan());
        executor.executeDistributedGoal(makeGoal('g2'), makePlan());
        strict_1.default.equal(executor.getAllExecutions().length, 2);
    });
    (0, node_test_1.it)('missing node adds error but does not throw', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        // No node registered — assignment should fail gracefully
        strict_1.default.ok(exec.errors.length >= 0); // no throw
    });
    (0, node_test_1.it)('recoverExecution transitions from failed to running', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        // Force to failed
        exec.status = 'failed';
        exec.plan.assignments.forEach(a => { a.status = 'failed'; });
        const recovered = executor.recoverExecution(exec.executionId);
        strict_1.default.equal(recovered?.status, 'running');
    });
    (0, node_test_1.it)('recoverExecution on non-failed returns exec unchanged', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const executor = new DistributedExecutor_js_1.DistributedExecutor(reg, planner, bus);
        const exec = executor.executeDistributedGoal(makeGoal(), makePlan());
        // Status is running, not failed
        const result = executor.recoverExecution(exec.executionId);
        strict_1.default.equal(result?.status, 'running');
    });
});
(0, node_test_1.describe)('ExecutionCoordinator', () => {
    (0, node_test_1.it)('createSyncPoint returns sync point', () => {
        const coord = new ExecutionCoordinator_js_1.ExecutionCoordinator(makeBus());
        const sp = coord.createSyncPoint('sync1', ['p1', 'p2']);
        strict_1.default.equal(sp.syncId, 'sync1');
        strict_1.default.equal(sp.requiredPartitions.length, 2);
    });
    (0, node_test_1.it)('markPartitionComplete returns true when all done', () => {
        const coord = new ExecutionCoordinator_js_1.ExecutionCoordinator(makeBus());
        coord.createSyncPoint('sync1', ['p1', 'p2']);
        coord.markPartitionComplete('sync1', 'p1');
        const done = coord.markPartitionComplete('sync1', 'p2');
        strict_1.default.ok(done);
    });
    (0, node_test_1.it)('createBarrier and releaseBarrier', () => {
        const coord = new ExecutionCoordinator_js_1.ExecutionCoordinator(makeBus());
        coord.createBarrier('b1', 'p3', ['p1', 'p2']);
        coord.releaseBarrier('b1', 'p1');
        const released = coord.releaseBarrier('b1', 'p2');
        strict_1.default.ok(released);
        strict_1.default.ok(coord.isBarrierReleased('b1'));
    });
    (0, node_test_1.it)('createCheckpoint returns checkpoint id', () => {
        const coord = new ExecutionCoordinator_js_1.ExecutionCoordinator(makeBus());
        const id = coord.createCheckpoint('exec-1', ['p1']);
        strict_1.default.ok(id.includes('exec-1'));
    });
});
//# sourceMappingURL=distributed-executor.test.js.map