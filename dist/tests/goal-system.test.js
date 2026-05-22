"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const GoalDecomposer_js_1 = require("../goals/GoalDecomposer.js");
function makeGoal(type = 'refactor', id = 'g1') {
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
(0, node_test_1.describe)('GoalDecomposer', () => {
    (0, node_test_1.test)('decomposes a refactor goal into sub-goals', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const goal = makeGoal('refactor');
        const subs = decomposer.decompose(goal);
        strict_1.default.ok(subs.length > 0, 'should produce sub-goals');
        strict_1.default.ok(subs.every(s => s.parentGoalId === goal.id), 'parent id set correctly');
    });
    (0, node_test_1.test)('decomposes repair goal', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const goal = makeGoal('repair');
        const subs = decomposer.decompose(goal);
        strict_1.default.ok(subs.length >= 2);
    });
    (0, node_test_1.test)('dependency ordering: later sub-goals reference earlier ones', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const goal = makeGoal('refactor');
        const subs = decomposer.decompose(goal);
        // Sub-goals with dependencies should reference ids of prior sub-goals
        const idsCreated = new Set(subs.map(s => s.id));
        for (const sub of subs) {
            const deps = sub.metadata?.dependsOnGoalIds ?? [];
            for (const dep of deps) {
                strict_1.default.ok(idsCreated.has(dep), `dependency ${dep} must be a sibling id`);
            }
        }
    });
    (0, node_test_1.test)('recursive decomposition with depth=2', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const goal = makeGoal('migrate');
        const subs = decomposer.decompose(goal, 2);
        strict_1.default.ok(subs.length > 0);
    });
    (0, node_test_1.test)('cycle detection throws on cyclic subGoals', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const child = makeGoal('cleanup', 'child-1');
        const parent = { ...makeGoal('refactor', 'parent-1'), subGoals: [] };
        // Manually create cycle
        child.subGoals = [parent];
        parent.subGoals = [child];
        strict_1.default.throws(() => decomposer.decompose(parent), /Cycle detected/);
    });
    (0, node_test_1.test)('all goal types produce non-empty decomposition', () => {
        const decomposer = new GoalDecomposer_js_1.GoalDecomposer();
        const types = ['repair', 'refactor', 'optimize', 'stabilize', 'migrate', 'cleanup', 'test'];
        for (const type of types) {
            const subs = decomposer.decompose(makeGoal(type));
            strict_1.default.ok(subs.length > 0, `${type} should decompose`);
        }
    });
});
//# sourceMappingURL=goal-system.test.js.map