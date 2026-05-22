import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Goal, GoalType } from '../goals/Goal.js';
import { GoalDecomposer } from '../goals/GoalDecomposer.js';

function makeGoal(type: GoalType = 'refactor', id = 'g1'): Goal {
  return {
    id,
    description: `Test ${type} goal`,
    type,
    priority: 'medium',
    constraints: { maxRisk: 50 },
    acceptanceCriteria: [],
    createdAt: new Date(),
    status: 'pending',
  };
}

describe('GoalDecomposer', () => {
  test('decomposes a refactor goal into sub-goals', () => {
    const decomposer = new GoalDecomposer();
    const goal = makeGoal('refactor');
    const subs = decomposer.decompose(goal);
    assert.ok(subs.length > 0, 'should produce sub-goals');
    assert.ok(subs.every(s => s.parentGoalId === goal.id), 'parent id set correctly');
  });

  test('decomposes repair goal', () => {
    const decomposer = new GoalDecomposer();
    const goal = makeGoal('repair');
    const subs = decomposer.decompose(goal);
    assert.ok(subs.length >= 2);
  });

  test('dependency ordering: later sub-goals reference earlier ones', () => {
    const decomposer = new GoalDecomposer();
    const goal = makeGoal('refactor');
    const subs = decomposer.decompose(goal);
    // Sub-goals with dependencies should reference ids of prior sub-goals
    const idsCreated = new Set(subs.map(s => s.id));
    for (const sub of subs) {
      const deps = (sub.metadata?.dependsOnGoalIds as string[]) ?? [];
      for (const dep of deps) {
        assert.ok(idsCreated.has(dep), `dependency ${dep} must be a sibling id`);
      }
    }
  });

  test('recursive decomposition with depth=2', () => {
    const decomposer = new GoalDecomposer();
    const goal = makeGoal('migrate');
    const subs = decomposer.decompose(goal, 2);
    assert.ok(subs.length > 0);
  });

  test('cycle detection throws on cyclic subGoals', () => {
    const decomposer = new GoalDecomposer();
    const child: Goal = makeGoal('cleanup', 'child-1');
    const parent: Goal = { ...makeGoal('refactor', 'parent-1'), subGoals: [] };
    // Manually create cycle
    child.subGoals = [parent];
    parent.subGoals = [child];

    assert.throws(() => decomposer.decompose(parent), /Cycle detected/);
  });

  test('all goal types produce non-empty decomposition', () => {
    const decomposer = new GoalDecomposer();
    const types: GoalType[] = ['repair', 'refactor', 'optimize', 'stabilize', 'migrate', 'cleanup', 'test'];
    for (const type of types) {
      const subs = decomposer.decompose(makeGoal(type));
      assert.ok(subs.length > 0, `${type} should decompose`);
    }
  });
});
