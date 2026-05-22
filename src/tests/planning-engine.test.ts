import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionGraph, ExecutionNode } from '../planning/ExecutionGraph.js';
import { PlanGenerator } from '../planning/PlanGenerator.js';
import { AdaptivePlanner } from '../planning/AdaptivePlanner.js';
import { GoalDecomposer } from '../goals/GoalDecomposer.js';
import { Goal } from '../goals/Goal.js';

function makeNode(id: string, risk = 10): ExecutionNode {
  return { id, goalId: `g-${id}`, label: `Node ${id}`, estimatedRisk: risk, cognitiveMode: 'default' };
}

function makeGoal(id = 'g1'): Goal {
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

describe('ExecutionGraph', () => {
  test('topological sort on linear chain', () => {
    const g = new ExecutionGraph();
    g.addNode(makeNode('a'));
    g.addNode(makeNode('b'));
    g.addNode(makeNode('c'));
    g.addEdge({ from: 'b', to: 'a', type: 'depends_on' }); // b depends on a
    g.addEdge({ from: 'c', to: 'b', type: 'depends_on' }); // c depends on b
    const sorted = g.topologicalSort();
    assert.equal(sorted.length, 3);
    const ids = sorted.map(n => n.id);
    assert.ok(ids.indexOf('a') < ids.indexOf('b'));
    assert.ok(ids.indexOf('b') < ids.indexOf('c'));
  });

  test('validateDAG returns true for acyclic graph', () => {
    const g = new ExecutionGraph();
    g.addNode(makeNode('a'));
    g.addNode(makeNode('b'));
    g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
    assert.equal(g.validateDAG(), true);
  });

  test('topologicalSort throws on cycle', () => {
    const g = new ExecutionGraph();
    g.addNode(makeNode('a'));
    g.addNode(makeNode('b'));
    g.addEdge({ from: 'a', to: 'b', type: 'depends_on' });
    g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
    assert.throws(() => g.topologicalSort(), /Cycle detected/);
  });

  test('ancestors and descendants', () => {
    const g = new ExecutionGraph();
    g.addNode(makeNode('a'));
    g.addNode(makeNode('b'));
    g.addNode(makeNode('c'));
    g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
    g.addEdge({ from: 'c', to: 'b', type: 'depends_on' });
    const ancs = g.ancestors('c');
    assert.ok(ancs.some(n => n.id === 'b'));
    const descs = g.descendants('a');
    assert.ok(descs.some(n => n.id === 'b'));
  });

  test('criticalPath returns non-empty for connected graph', () => {
    const g = new ExecutionGraph();
    g.addNode(makeNode('a', 5));
    g.addNode(makeNode('b', 20));
    g.addNode(makeNode('c', 10));
    g.addEdge({ from: 'b', to: 'a', type: 'depends_on' });
    g.addEdge({ from: 'c', to: 'a', type: 'depends_on' });
    const path = g.criticalPath();
    assert.ok(path.length > 0);
  });
});

describe('PlanGenerator', () => {
  test('generates plan from goals', () => {
    const decomposer = new GoalDecomposer();
    const generator = new PlanGenerator();
    const goal = makeGoal();
    const subs = decomposer.decompose(goal);
    const goalWithSubs = { ...goal, subGoals: subs };
    const plan = generator.generate([goalWithSubs]);
    assert.ok(plan.id.startsWith('plan-'));
    assert.ok(plan.steps.length > 0);
    assert.ok(plan.estimatedTotalRisk > 0);
  });
});

describe('AdaptivePlanner', () => {
  test('replan removes failed step and descendants', () => {
    const decomposer = new GoalDecomposer();
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const goal = makeGoal();
    const subs = decomposer.decompose(goal);
    const plan = generator.generate([{ ...goal, subGoals: subs }]);
    const firstStep = plan.steps[0];
    const replanned = planner.replan(plan, firstStep.id, new Error('fail'));
    assert.ok(!replanned.steps.some(s => s.id === firstStep.id));
    // replanned should be a new object
    assert.notEqual(replanned.id, plan.id);
  });

  test('reduceScope filters out high-risk steps', () => {
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const goal: Goal = { ...makeGoal(), constraints: { maxRisk: 100 } };
    const plan = generator.generate([goal]);
    // Add a fake high-risk step manually
    const highRiskPlan = { ...plan, steps: [...plan.steps, { id: 'x', goalId: 'g', label: 'x', estimatedRisk: 99, dependencies: [], cognitiveMode: 'default', rollbackStrategy: 'abort' as const }] };
    const reduced = planner.reduceScope(highRiskPlan, 50);
    assert.ok(!reduced.steps.some(s => s.estimatedRisk > 50));
  });

  test('splitStep splits one step into two', () => {
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const goal = makeGoal();
    const plan = generator.generate([goal]);
    const stepToSplit = plan.steps[0];
    const split = planner.splitStep(plan, stepToSplit.id);
    const part1 = split.steps.find(s => s.id === `${stepToSplit.id}-part1`);
    const part2 = split.steps.find(s => s.id === `${stepToSplit.id}-part2`);
    assert.ok(part1, 'part1 should exist');
    assert.ok(part2, 'part2 should exist');
    assert.ok(part2!.dependencies.includes(part1!.id), 'part2 depends on part1');
  });

  test('injectRecoveryStep inserts a recovery step', () => {
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const goal = makeGoal();
    const plan = generator.generate([goal]);
    const afterStep = plan.steps[0];
    const injected = planner.injectRecoveryStep(plan, afterStep.id);
    const recovery = injected.steps.find(s => s.id.startsWith('recovery-'));
    assert.ok(recovery, 'recovery step should exist');
    assert.ok(recovery!.dependencies.includes(afterStep.id));
  });

  test('abortPlan returns new plan object', () => {
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const plan = generator.generate([makeGoal()]);
    const aborted = planner.abortPlan(plan);
    assert.notEqual(aborted.id, plan.id);
    assert.equal(aborted.estimatedTotalRisk, 0);
  });
});
