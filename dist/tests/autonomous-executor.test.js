"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ExecutionCheckpoint_js_1 = require("../autonomous-execution/ExecutionCheckpoint.js");
const AutonomousExecutor_js_1 = require("../autonomous-execution/AutonomousExecutor.js");
const AdaptivePlanner_js_1 = require("../planning/AdaptivePlanner.js");
const PlanGenerator_js_1 = require("../planning/PlanGenerator.js");
const GoalDecomposer_js_1 = require("../goals/GoalDecomposer.js");
function makeGoal() {
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
(0, node_test_1.describe)('CheckpointManager', () => {
    (0, node_test_1.test)('save and restore checkpoint', () => {
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const state = { planId: 'p1', completedSteps: ['s1', 's2'], failedSteps: [], rolledBackSteps: [] };
        const ckpt = mgr.save(state, []);
        strict_1.default.ok(ckpt.id.startsWith('ckpt-'));
        const restored = mgr.restore(ckpt.id);
        strict_1.default.ok(restored !== undefined);
        strict_1.default.deepEqual(restored.state.completedSteps, ['s1', 's2']);
    });
    (0, node_test_1.test)('rewind removes steps after toStepId', () => {
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const state = { planId: 'p1', completedSteps: ['s1', 's2', 's3'], failedSteps: [], rolledBackSteps: [] };
        const ckpt = mgr.save(state, []);
        const rewound = mgr.rewind(ckpt.id, 's1');
        strict_1.default.deepEqual(rewound.completedSteps, ['s1']);
        strict_1.default.ok(rewound.rolledBackSteps.includes('s2'));
        strict_1.default.ok(rewound.rolledBackSteps.includes('s3'));
    });
    (0, node_test_1.test)('list returns all checkpoints', () => {
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const state = { planId: 'p1', completedSteps: [], failedSteps: [], rolledBackSteps: [] };
        mgr.save(state, []);
        mgr.save(state, []);
        strict_1.default.ok(mgr.list().length >= 2);
    });
});
(0, node_test_1.describe)('AutonomousExecutor', () => {
    (0, node_test_1.test)('dry-run executes without side effects and returns results', async () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const plan = generator.generate([makeGoal()]);
        const results = await executor.execute(plan, { dryRun: true });
        strict_1.default.ok(results.length > 0);
        strict_1.default.ok(results[0].notes.includes('dry-run mode'));
    });
    (0, node_test_1.test)('emits step:start and step:complete events', async () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const plan = generator.generate([makeGoal()]);
        const events = [];
        executor.on('step:start', () => events.push('start'));
        executor.on('step:complete', () => events.push('complete'));
        await executor.execute(plan, { dryRun: true });
        strict_1.default.ok(events.includes('start'));
        strict_1.default.ok(events.includes('complete'));
    });
    (0, node_test_1.test)('abort stops execution', async () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal();
        const subs = decomposer.decompose(goal);
        const plan = generator.generate([{ ...goal, subGoals: subs }]);
        executor.on('step:start', () => executor.abort());
        const abortEvents = [];
        executor.on('aborted', () => abortEvents.push(true));
        await executor.execute(plan, { dryRun: true });
        strict_1.default.ok(abortEvents.length > 0);
    });
    (0, node_test_1.test)('checkpoint is saved after execution', async () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const plan = generator.generate([makeGoal()]);
        await executor.execute(plan, { dryRun: true });
        strict_1.default.ok(mgr.list().length >= 1);
    });
});
//# sourceMappingURL=autonomous-executor.test.js.map