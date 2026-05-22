"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ExecutionGraph_js_1 = require("../planning/ExecutionGraph.js");
const PlanGenerator_js_1 = require("../planning/PlanGenerator.js");
const AdaptivePlanner_js_1 = require("../planning/AdaptivePlanner.js");
const GoalDecomposer_js_1 = require("../goals/GoalDecomposer.js");
function makeNode(id, risk = 10) {
    return { id, goalId: `g-${id}`, label: `Node ${id}`, estimatedRisk: risk, cognitiveMode: 'default' };
}
function makeGoal(id = 'g1') {
    return {
        id,
        description: 'Test refactor goal',
        type: 'refactor',
        priority: 'medium',
        constraints: { maxRisk: 40 },
        acceptanceCriteria: [],
        createdAt: new Date(),
        status: 'pending',
    };
}
(0, node_test_1.describe)('ExecutionGraph', () => {
    (0, node_test_1.test)('topological sort on linear chain', () => {
        const g = new ExecutionGraph_js_1.ExecutionGraph();
        g.addNode(makeNode('a'));
        g.addNode(makeNode('b'));
        g.addNode(makeNode('c'));
        g.addEdge({ from: 'b', to: 'a', type: 'depends_on' }); // b depends on a
        g.addEdge({ from: 'c', to: 'b', type: 'depends_on' }); // c depends on b
        const sorted = g.topologicalSort();
        strict_1.default.equal(sorted.length, 3);
        const ids = sorted.map(n => n.id);
        strict_1.default.ok(ids.indexOf('a') < ids.indexOf('b'));
        strict_1.default.ok(ids.indexOf('b') < ids.indexOf('c'));
    });
    (0, node_test_1.test)('validateDAG returns true for acyclic graph', () => {
        const g = new ExecutionGraph_js_1.ExecutionGraph();
        g.addNode(makeNode('a'));
        g.addNode(makeNode('b'));
        g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
        strict_1.default.equal(g.validateDAG(), true);
    });
    (0, node_test_1.test)('topologicalSort throws on cycle', () => {
        const g = new ExecutionGraph_js_1.ExecutionGraph();
        g.addNode(makeNode('a'));
        g.addNode(makeNode('b'));
        g.addEdge({ from: 'a', to: 'b', type: 'depends_on' });
        g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
        strict_1.default.throws(() => g.topologicalSort(), /Cycle detected/);
    });
    (0, node_test_1.test)('ancestors and descendants', () => {
        const g = new ExecutionGraph_js_1.ExecutionGraph();
        g.addNode(makeNode('a'));
        g.addNode(makeNode('b'));
        g.addNode(makeNode('c'));
        g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
        g.addEdge({ from: 'c', to: 'b', type: 'depends_on' });
        const ancs = g.ancestors('c');
        strict_1.default.ok(ancs.some(n => n.id === 'b'));
        const descs = g.descendants('a');
        strict_1.default.ok(descs.some(n => n.id === 'b'));
    });
    (0, node_test_1.test)('criticalPath returns non-empty for connected graph', () => {
        const g = new ExecutionGraph_js_1.ExecutionGraph();
        g.addNode(makeNode('a', 5));
        g.addNode(makeNode('b', 20));
        g.addNode(makeNode('c', 10));
        g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
        g.addEdge({ from: 'c', to: 'a', type: 'depends_on' });
        const path = g.criticalPath();
        strict_1.default.ok(path.length > 0);
    });
});
(0, node_test_1.describe)('PlanGenerator', () => {
    (0, node_test_1.test)('generates plan from goals', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal();
        const subs = decomposer.decompose(goal);
        const goalWithSubs = { ...goal, subGoals: subs };
        const plan = generator.generate([goalWithSubs]);
        strict_1.default.ok(plan.id.startsWith('plan-'));
        strict_1.default.ok(plan.steps.length > 0);
        strict_1.default.ok(plan.estimatedTotalRisk > 0);
    });
});
(0, node_test_1.describe)('AdaptivePlanner', () => {
    (0, node_test_1.test)('replan removes failed step and descendants', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const goal = makeGoal();
        const subs = decomposer.decompose(goal);
        const plan = generator.generate([{ ...goal, subGoals: subs }]);
        const firstStep = plan.steps[0];
        const replanned = planner.replan(plan, firstStep.id, new Error('fail'));
        strict_1.default.ok(!replanned.steps.some(s => s.id === firstStep.id));
        // replanned should be a new object
        strict_1.default.notEqual(replanned.id, plan.id);
    });
    (0, node_test_1.test)('reduceScope filters out high-risk steps', () => {
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const goal = { ...makeGoal(), constraints: { maxRisk: 100 } };
        const plan = generator.generate([goal]);
        // Add a fake high-risk step manually
        const highRiskPlan = { ...plan, steps: [...plan.steps, { id: 'x', goalId: 'g', label: 'x', estimatedRisk: 99, dependencies: [], cognitiveMode: 'default', rollbackStrategy: 'abort' }] };
        const reduced = planner.reduceScope(highRiskPlan, 50);
        strict_1.default.ok(!reduced.steps.some(s => s.estimatedRisk > 50));
    });
    (0, node_test_1.test)('splitStep splits one step into two', () => {
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const goal = makeGoal();
        const plan = generator.generate([goal]);
        const stepToSplit = plan.steps[0];
        const split = planner.splitStep(plan, stepToSplit.id);
        const part1 = split.steps.find(s => s.id === `${stepToSplit.id}-part1`);
        const part2 = split.steps.find(s => s.id === `${stepToSplit.id}-part2`);
        strict_1.default.ok(part1, 'part1 should exist');
        strict_1.default.ok(part2, 'part2 should exist');
        strict_1.default.ok(part2.dependencies.includes(part1.id), 'part2 depends on part1');
    });
    (0, node_test_1.test)('injectRecoveryStep inserts a recovery step', () => {
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const goal = makeGoal();
        const plan = generator.generate([goal]);
        const afterStep = plan.steps[0];
        const injected = planner.injectRecoveryStep(plan, afterStep.id);
        const recovery = injected.steps.find(s => s.id.startsWith('recovery-'));
        strict_1.default.ok(recovery, 'recovery step should exist');
        strict_1.default.ok(recovery.dependencies.includes(afterStep.id));
    });
    (0, node_test_1.test)('abortPlan returns new plan object', () => {
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const plan = generator.generate([makeGoal()]);
        const aborted = planner.abortPlan(plan);
        strict_1.default.notEqual(aborted.id, plan.id);
        strict_1.default.equal(aborted.estimatedTotalRisk, 0);
    });
});
//# sourceMappingURL=planning-engine.test.js.map