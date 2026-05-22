"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalDecomposer = void 0;
const DECOMPOSITION_RULES = {
    refactor: [
        { description: 'Extract interfaces from concrete types', type: 'cleanup' },
        { description: 'Move functions to appropriate modules', type: 'refactor', dependsOn: ['Extract interfaces from concrete types'] },
        { description: 'Inject dependencies via constructor', type: 'refactor', dependsOn: ['Move functions to appropriate modules'] },
        { description: 'Split large modules into cohesive units', type: 'cleanup', dependsOn: ['Inject dependencies via constructor'] },
    ],
    repair: [
        { description: 'Identify root cause of failure', type: 'test' },
        { description: 'Apply targeted fix', type: 'repair', dependsOn: ['Identify root cause of failure'] },
        { description: 'Verify fix with regression tests', type: 'test', dependsOn: ['Apply targeted fix'] },
    ],
    optimize: [
        { description: 'Profile performance bottlenecks', type: 'test' },
        { description: 'Apply algorithmic improvements', type: 'optimize', dependsOn: ['Profile performance bottlenecks'] },
        { description: 'Validate correctness after optimization', type: 'test', dependsOn: ['Apply algorithmic improvements'] },
    ],
    stabilize: [
        { description: 'Add defensive null checks', type: 'repair' },
        { description: 'Add error boundaries', type: 'repair', dependsOn: ['Add defensive null checks'] },
        { description: 'Add stability tests', type: 'test', dependsOn: ['Add error boundaries'] },
    ],
    migrate: [
        { description: 'Audit current API surface', type: 'cleanup' },
        { description: 'Create compatibility shims', type: 'migrate', dependsOn: ['Audit current API surface'] },
        { description: 'Migrate call sites incrementally', type: 'migrate', dependsOn: ['Create compatibility shims'] },
        { description: 'Remove deprecated shims', type: 'cleanup', dependsOn: ['Migrate call sites incrementally'] },
    ],
    cleanup: [
        { description: 'Remove dead code', type: 'cleanup' },
        { description: 'Normalize naming conventions', type: 'cleanup', dependsOn: ['Remove dead code'] },
        { description: 'Deduplicate logic', type: 'refactor', dependsOn: ['Normalize naming conventions'] },
    ],
    test: [
        { description: 'Identify untested code paths', type: 'test' },
        { description: 'Write unit tests for critical paths', type: 'test', dependsOn: ['Identify untested code paths'] },
        { description: 'Write integration tests', type: 'test', dependsOn: ['Write unit tests for critical paths'] },
    ],
};
function makeId() {
    return `goal-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}
class GoalDecomposer {
    decompose(goal, depth = 1) {
        this._checkCycles(goal, new Set());
        return this._decompose(goal, depth);
    }
    _decompose(goal, depth) {
        if (depth <= 0)
            return [];
        const templates = DECOMPOSITION_RULES[goal.type] ?? [];
        const created = [];
        const labelToId = new Map();
        for (const tmpl of templates) {
            const id = makeId();
            labelToId.set(tmpl.description, id);
            const depIds = (tmpl.dependsOn ?? [])
                .map(label => labelToId.get(label))
                .filter((id) => id !== undefined);
            const child = {
                id,
                description: tmpl.description,
                type: tmpl.type,
                priority: goal.priority,
                constraints: { ...goal.constraints },
                acceptanceCriteria: [],
                createdAt: new Date(),
                status: 'pending',
                parentGoalId: goal.id,
                metadata: { dependsOnGoalIds: depIds },
            };
            // Recurse if depth allows and it's a different type (avoid infinite recursion on same type)
            if (depth > 1 && tmpl.type !== goal.type) {
                child.subGoals = this._decompose(child, depth - 1);
            }
            created.push(child);
        }
        return created;
    }
    _checkCycles(goal, visited) {
        if (visited.has(goal.id)) {
            throw new Error(`Cycle detected in goal graph at goal id: ${goal.id}`);
        }
        visited.add(goal.id);
        for (const sub of goal.subGoals ?? []) {
            this._checkCycles(sub, new Set(visited));
        }
    }
}
exports.GoalDecomposer = GoalDecomposer;
//# sourceMappingURL=GoalDecomposer.js.map