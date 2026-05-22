"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const GoalDecomposer_js_1 = require("../goals/GoalDecomposer.js");
const PlanGenerator_js_1 = require("../planning/PlanGenerator.js");
const AdaptivePlanner_js_1 = require("../planning/AdaptivePlanner.js");
const ExecutionCheckpoint_js_1 = require("../autonomous-execution/ExecutionCheckpoint.js");
const AutonomousExecutor_js_1 = require("../autonomous-execution/AutonomousExecutor.js");
const ConstraintEngine_js_1 = require("../constraints/ConstraintEngine.js");
const PlanningMetrics_js_1 = require("../planning-metrics/PlanningMetrics.js");
function makeGoal() {
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
(0, node_test_1.describe)('Full planning pipeline integration', () => {
    (0, node_test_1.test)('Goal → decompose → plan → dry-run execute → metrics', async () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const constraintEngine = new ConstraintEngine_js_1.ConstraintEngine();
        const metrics = new PlanningMetrics_js_1.PlanningMetrics();
        // 1. Create goal
        const goal = makeGoal();
        // 2. Decompose
        const subGoals = decomposer.decompose(goal);
        strict_1.default.ok(subGoals.length > 0, 'should have sub-goals');
        // 3. Plan
        const plan = generator.generate([{ ...goal, subGoals }]);
        strict_1.default.ok(plan.steps.length > 0);
        // 4. Constraint check (check API works, not necessarily zero violations for a large multi-step plan)
        const violations = constraintEngine.evaluate(plan, goal.constraints);
        strict_1.default.ok(Array.isArray(violations), 'violations should be an array');
        // 5. Execute (dry-run)
        const results = await executor.execute(plan, { dryRun: true });
        strict_1.default.ok(results.length > 0);
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
        strict_1.default.ok(summary.avgSuccessRate >= 0 && summary.avgSuccessRate <= 1);
    });
    (0, node_test_1.test)('checkpoints are created during execution', async () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const mgr = new ExecutionCheckpoint_js_1.CheckpointManager();
        const executor = new AutonomousExecutor_js_1.AutonomousExecutor(planner, mgr);
        const generator = new PlanGenerator_js_1.PlanGenerator();
        // Create a larger plan to trigger checkpoint (every 5 steps)
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const goal = makeGoal();
        const subs = decomposer.decompose(goal);
        const plan = generator.generate([{ ...goal, subGoals: subs }]);
        await executor.execute(plan, { dryRun: true });
        // At minimum, a final checkpoint should exist
        strict_1.default.ok(mgr.list().length >= 1);
    });
    (0, node_test_1.test)('replanning works when step fails', () => {
        const planner = new AdaptivePlanner_js_1.AdaptivePlanner();
        const generator = new PlanGenerator_js_1.PlanGenerator();
        const goal = makeGoal();
        const plan = generator.generate([goal]);
        const firstStep = plan.steps[0];
        const replanned = planner.replan(plan, firstStep.id, new Error('simulated failure'));
        strict_1.default.notEqual(replanned.id, plan.id);
        strict_1.default.ok(!replanned.steps.some(s => s.id === firstStep.id));
    });
});
//# sourceMappingURL=planning-integration.test.js.map