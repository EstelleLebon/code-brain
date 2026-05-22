"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanGenerator = void 0;
const ExecutionGraph_js_1 = require("./ExecutionGraph.js");
function makePlanId() {
    return `plan-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}
function goalTypeToMode(type) {
    const map = {
        repair: 'surgical',
        refactor: 'exploratory',
        optimize: 'analytical',
        stabilize: 'conservative',
        migrate: 'incremental',
        cleanup: 'batch',
        test: 'validation',
    };
    return map[type] ?? 'default';
}
function rollbackStrategy(risk) {
    if (risk >= 80)
        return 'abort';
    if (risk >= 50)
        return 'compensate';
    if (risk >= 20)
        return 'revert';
    return 'none';
}
class PlanGenerator {
    generate(goals) {
        const steps = [];
        const graph = new ExecutionGraph_js_1.ExecutionGraph();
        const goalIdToStepId = new Map();
        // Flatten goals (include subGoals recursively)
        const allGoals = this._flattenGoals(goals);
        for (const goal of allGoals) {
            const stepId = `step-${goal.id}`;
            const risk = goal.constraints.maxRisk ?? 30;
            goalIdToStepId.set(goal.id, stepId);
            const step = {
                id: stepId,
                goalId: goal.id,
                label: goal.description,
                estimatedRisk: risk,
                dependencies: [],
                cognitiveMode: goalTypeToMode(goal.type),
                rollbackStrategy: rollbackStrategy(risk),
            };
            steps.push(step);
            const node = {
                id: stepId,
                goalId: goal.id,
                label: goal.description,
                estimatedRisk: risk,
                cognitiveMode: step.cognitiveMode,
            };
            graph.addNode(node);
        }
        // Wire dependency edges based on parentGoalId and metadata.dependsOnGoalIds
        for (const goal of allGoals) {
            const stepId = goalIdToStepId.get(goal.id);
            const depIds = goal.metadata?.dependsOnGoalIds ?? [];
            for (const depGoalId of depIds) {
                const depStepId = goalIdToStepId.get(depGoalId);
                if (depStepId) {
                    const step = steps.find(s => s.id === stepId);
                    step.dependencies.push(depStepId);
                    graph.addEdge({ from: stepId, to: depStepId, type: 'depends_on' });
                }
            }
        }
        const totalRisk = steps.reduce((sum, s) => sum + s.estimatedRisk, 0);
        return {
            id: makePlanId(),
            goals,
            steps,
            graph,
            createdAt: new Date(),
            estimatedTotalRisk: totalRisk,
        };
    }
    _flattenGoals(goals) {
        const result = [];
        for (const g of goals) {
            result.push(g);
            if (g.subGoals && g.subGoals.length > 0) {
                result.push(...this._flattenGoals(g.subGoals));
            }
        }
        return result;
    }
}
exports.PlanGenerator = PlanGenerator;
//# sourceMappingURL=PlanGenerator.js.map