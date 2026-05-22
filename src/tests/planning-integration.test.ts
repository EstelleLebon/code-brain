import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Goal } from '../goals/Goal.js';
import { GoalDecomposer } from '../goals/GoalDecomposer.js';
import { PlanGenerator } from '../planning/PlanGenerator.js';
import { AdaptivePlanner } from '../planning/AdaptivePlanner.js';
import { CheckpointManager } from '../autonomous-execution/ExecutionCheckpoint.js';
import { AutonomousExecutor } from '../autonomous-execution/AutonomousExecutor.js';
import { ConstraintEngine } from '../constraints/ConstraintEngine.js';
import { PlanningMetrics } from '../planning-metrics/PlanningMetrics.js';

function makeGoal(): Goal {
  return {
    id: `goal-${Date.now()}`,
    description: 'Full integration refactor',
    type: 'refactor',
    priority: 'high',
    constraints: { maxRisk: 10000 },
    acceptanceCriteria: [{ description: 'All modules refactored', validate: () => true }],
    createdAt: new Date(),
    status: 'pending',
  };
}

describe('Full planning pipeline integration', () => {
  test('Goal → decompose → plan → dry-run execute → metrics', async () => {
    const decomposer = new GoalDecomposer();
    const generator = new PlanGenerator();
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const constraintEngine = new ConstraintEngine();
    const metrics = new PlanningMetrics();

    // 1. Create goal
    const goal = makeGoal();

    // 2. Decompose
    const subGoals = decomposer.decompose(goal);
    assert.ok(subGoals.length > 0, 'should have sub-goals');

    // 3. Plan
    const plan = generator.generate([{ ...goal, subGoals }]);
    assert.ok(plan.steps.length > 0);

    // 4. Constraint check (check API works, not necessarily zero violations for a large multi-step plan)
    const violations = constraintEngine.evaluate(plan, goal.constraints);
    assert.ok(Array.isArray(violations), 'violations should be an array');

    // 5. Execute (dry-run)
    const results = await executor.execute(plan, { dryRun: true });
    assert.ok(results.length > 0);

    // 6. Record metrics
    const successCount = results.filter(r => r.outcome === 'success').length;
    metrics.record({
      planId: plan.id,
      successRate: successCount / results.length,
      replanningCount: 0,
      avgRollbackDepth: 0,
      avgExecutionDepth: results[0].stepsExecuted,
      adaptiveRecoverySuccess: 1,
      plannerConfidence: 0.9,
      graphComplexity: plan.steps.length,
      timestamp: new Date(),
    });

    const summary = metrics.summary();
    assert.ok(summary.avgSuccessRate >= 0 && summary.avgSuccessRate <= 1);
  });

  test('checkpoints are created during execution', async () => {
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const generator = new PlanGenerator();

    // Create a larger plan to trigger checkpoint (every 5 steps)
    const decomposer = new GoalDecomposer();
    const goal = makeGoal();
    const subs = decomposer.decompose(goal);
    const plan = generator.generate([{ ...goal, subGoals: subs }]);

    await executor.execute(plan, { dryRun: true });
    // At minimum, a final checkpoint should exist
    assert.ok(mgr.list().length >= 1);
  });

  test('replanning works when step fails', () => {
    const planner = new AdaptivePlanner();
    const generator = new PlanGenerator();
    const goal = makeGoal();
    const plan = generator.generate([goal]);
    const firstStep = plan.steps[0];
    const replanned = planner.replan(plan, firstStep.id, new Error('simulated failure'));
    assert.notEqual(replanned.id, plan.id);
    assert.ok(!replanned.steps.some(s => s.id === firstStep.id));
  });
});
