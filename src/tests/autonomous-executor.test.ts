import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CheckpointManager } from '../autonomous-execution/ExecutionCheckpoint.js';
import { AutonomousExecutor } from '../autonomous-execution/AutonomousExecutor.js';
import { AdaptivePlanner } from '../planning/AdaptivePlanner.js';
import { PlanGenerator } from '../planning/PlanGenerator.js';
import { GoalDecomposer } from '../goals/GoalDecomposer.js';
import { Goal } from '../goals/Goal.js';

function makeGoal(): Goal {
  return {
    id: 'g1',
    description: 'Test goal',
    type: 'cleanup',
    priority: 'medium',
    constraints: { maxRisk: 40 },
    acceptanceCriteria: [],
    createdAt: new Date(),
    status: 'pending',
  };
}

describe('CheckpointManager', () => {
  test('save and restore checkpoint', () => {
    const mgr = new CheckpointManager();
    const state = { planId: 'p1', completedSteps: ['s1', 's2'], failedSteps: [], rolledBackSteps: [] };
    const ckpt = mgr.save(state, []);
    assert.ok(ckpt.id.startsWith('ckpt-'));
    const restored = mgr.restore(ckpt.id);
    assert.ok(restored !== undefined);
    assert.deepEqual(restored!.state.completedSteps, ['s1', 's2']);
  });

  test('rewind removes steps after toStepId', () => {
    const mgr = new CheckpointManager();
    const state = { planId: 'p1', completedSteps: ['s1', 's2', 's3'], failedSteps: [], rolledBackSteps: [] };
    const ckpt = mgr.save(state, []);
    const rewound = mgr.rewind(ckpt.id, 's1');
    assert.deepEqual(rewound.completedSteps, ['s1']);
    assert.ok(rewound.rolledBackSteps.includes('s2'));
    assert.ok(rewound.rolledBackSteps.includes('s3'));
  });

  test('list returns all checkpoints', () => {
    const mgr = new CheckpointManager();
    const state = { planId: 'p1', completedSteps: [], failedSteps: [], rolledBackSteps: [] };
    mgr.save(state, []);
    mgr.save(state, []);
    assert.ok(mgr.list().length >= 2);
  });
});

describe('AutonomousExecutor', () => {
  test('dry-run executes without side effects and returns results', async () => {
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const generator = new PlanGenerator();
    const plan = generator.generate([makeGoal()]);
    const results = await executor.execute(plan, { dryRun: true });
    assert.ok(results.length > 0);
    assert.ok(results[0].notes.includes('dry-run mode'));
  });

  test('emits step:start and step:complete events', async () => {
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const generator = new PlanGenerator();
    const plan = generator.generate([makeGoal()]);

    const events: string[] = [];
    executor.on('step:start', () => events.push('start'));
    executor.on('step:complete', () => events.push('complete'));

    await executor.execute(plan, { dryRun: true });
    assert.ok(events.includes('start'));
    assert.ok(events.includes('complete'));
  });

  test('abort stops execution', async () => {
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const decomposer = new GoalDecomposer();
    const generator = new PlanGenerator();
    const goal = makeGoal();
    const subs = decomposer.decompose(goal);
    const plan = generator.generate([{ ...goal, subGoals: subs }]);

    executor.on('step:start', () => executor.abort());
    const abortEvents: unknown[] = [];
    executor.on('aborted', () => abortEvents.push(true));

    await executor.execute(plan, { dryRun: true });
    assert.ok(abortEvents.length > 0);
  });

  test('checkpoint is saved after execution', async () => {
    const planner = new AdaptivePlanner();
    const mgr = new CheckpointManager();
    const executor = new AutonomousExecutor(planner, mgr);
    const generator = new PlanGenerator();
    const plan = generator.generate([makeGoal()]);
    await executor.execute(plan, { dryRun: true });
    assert.ok(mgr.list().length >= 1);
  });
});
