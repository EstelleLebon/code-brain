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
const ExecutionGraph_js_1 = require("../planning/ExecutionGraph.js");
function makeBus() { return new DistributedEventBus_js_1.DistributedEventBus(); }
function makeNode(id, bus) {
    return new CognitiveNode_js_1.CognitiveNode({
        nodeId: id,
        capabilities: { canPlan: true, canExecute: true, canReplicate: true, canVote: true, maxConcurrentGoals: 5, supportedOperationTypes: ['default'] },
        bus,
    });
}
function makePlan(steps) {
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
            rollbackStrategy: 'none',
        })),
        graph: new ExecutionGraph_js_1.ExecutionGraph(),
        createdAt: new Date(),
        estimatedTotalRisk: 0.1,
    };
}
(0, node_test_1.describe)('DistributedPlanner', () => {
    (0, node_test_1.it)('partitionPlan groups by cognitiveMode', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([
            { id: 's1', cognitiveMode: 'analytical' },
            { id: 's2', cognitiveMode: 'analytical' },
            { id: 's3', cognitiveMode: 'surgical' },
        ]);
        const partitions = planner.partitionPlan(plan);
        strict_1.default.equal(partitions.length, 2);
    });
    (0, node_test_1.it)('partitionPlan empty plan returns empty', () => {
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([]);
        const partitions = planner.partitionPlan(plan);
        strict_1.default.equal(partitions.length, 0);
    });
    (0, node_test_1.it)('assignPartitions assigns to least loaded node', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        reg.register(makeNode('n2', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const partitions = planner.partitionPlan(plan);
        const assignments = planner.assignPartitions(partitions);
        strict_1.default.equal(assignments.length, 1);
        strict_1.default.ok(['n1', 'n2'].includes(assignments[0].nodeId));
    });
    (0, node_test_1.it)('assignPartitions with no nodes uses unassigned', () => {
        const reg = new NodeRegistry_js_1.NodeRegistry();
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const partitions = planner.partitionPlan(plan);
        const assignments = planner.assignPartitions(partitions);
        strict_1.default.equal(assignments[0].nodeId, 'unassigned');
    });
    (0, node_test_1.it)('buildDistributedPlan produces valid plan', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const distPlan = planner.buildDistributedPlan(plan);
        strict_1.default.equal(distPlan.originalPlanId, 'plan-1');
        strict_1.default.ok(distPlan.partitions.length > 0);
        strict_1.default.ok(distPlan.assignments.length > 0);
        strict_1.default.ok(distPlan.criticalPath.length > 0);
    });
    (0, node_test_1.it)('buildDistributedPlan criticalPath has first partition', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const distPlan = planner.buildDistributedPlan(plan);
        strict_1.default.ok(distPlan.criticalPath.includes('partition-0'));
    });
    (0, node_test_1.it)('rebalance reassigns all partitions', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        reg.register(makeNode('n2', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const distPlan = planner.buildDistributedPlan(plan);
        const rebalanced = planner.rebalance(distPlan);
        strict_1.default.equal(rebalanced.partitions.length, distPlan.partitions.length);
        strict_1.default.equal(rebalanced.assignments.length, distPlan.assignments.length);
    });
    (0, node_test_1.it)('recoverPartition reassigns failed partition', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const distPlan = planner.buildDistributedPlan(plan);
        distPlan.assignments[0].status = 'failed';
        const recovered = planner.recoverPartition(distPlan, 'partition-0');
        strict_1.default.equal(recovered.assignments[0].status, 'pending');
    });
    (0, node_test_1.it)('partitions have estimatedCost equal to operation count', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([
            { id: 's1', cognitiveMode: 'default' },
            { id: 's2', cognitiveMode: 'default' },
        ]);
        const partitions = planner.partitionPlan(plan);
        strict_1.default.equal(partitions[0].estimatedCost, 2);
    });
    (0, node_test_1.it)('first partition has critical priority', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([
            { id: 's1', cognitiveMode: 'a' },
            { id: 's2', cognitiveMode: 'b' },
        ]);
        const partitions = planner.partitionPlan(plan);
        strict_1.default.equal(partitions[0].priority, 'critical');
    });
    (0, node_test_1.it)('assignments start in pending status', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([{ id: 's1', cognitiveMode: 'default' }]);
        const distPlan = planner.buildDistributedPlan(plan);
        strict_1.default.equal(distPlan.assignments[0].status, 'pending');
    });
    (0, node_test_1.it)('multiple types create multiple partitions', () => {
        const bus = makeBus();
        const reg = new NodeRegistry_js_1.NodeRegistry();
        reg.register(makeNode('n1', bus));
        const planner = new DistributedPlanner_js_1.DistributedPlanner(reg);
        const plan = makePlan([
            { id: 's1', cognitiveMode: 'a' },
            { id: 's2', cognitiveMode: 'b' },
            { id: 's3', cognitiveMode: 'c' },
        ]);
        const partitions = planner.partitionPlan(plan);
        strict_1.default.equal(partitions.length, 3);
    });
});
//# sourceMappingURL=distributed-planner.test.js.map