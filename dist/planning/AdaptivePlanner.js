"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptivePlanner = void 0;
const ExecutionGraph_js_1 = require("./ExecutionGraph.js");
function makePlanId() {
    return `plan-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}
function clonePlan(plan, overrides = {}) {
    return {
        ...plan,
        id: makePlanId(),
        createdAt: new Date(),
        steps: plan.steps.map(s => ({ ...s })),
        ...overrides,
    };
}
function rebuildGraph(steps) {
    const graph = new ExecutionGraph_js_1.ExecutionGraph();
    for (const step of steps) {
        graph.addNode({
            id: step.id,
            goalId: step.goalId,
            label: step.label,
            estimatedRisk: step.estimatedRisk,
            cognitiveMode: step.cognitiveMode,
        });
    }
    for (const step of steps) {
        for (const dep of step.dependencies) {
            graph.addEdge({ from: step.id, to: dep, type: 'depends_on' });
        }
    }
    return graph;
}
class AdaptivePlanner {
    replan(plan, failedStepId, _feedback) {
        // Remove failed step and its descendants from plan
        const failedStep = plan.steps.find(s => s.id === failedStepId);
        if (!failedStep)
            return clonePlan(plan);
        const descendants = plan.graph.descendants(failedStepId).map(n => n.id);
        const removedIds = new Set([failedStepId, ...descendants]);
        const newSteps = plan.steps
            .filter(s => !removedIds.has(s.id))
            .map(s => ({
            ...s,
            dependencies: s.dependencies.filter(d => !removedIds.has(d)),
        }));
        const newGraph = rebuildGraph(newSteps);
        const totalRisk = newSteps.reduce((sum, s) => sum + s.estimatedRisk, 0);
        return clonePlan(plan, { steps: newSteps, graph: newGraph, estimatedTotalRisk: totalRisk });
    }
    reduceScope(plan, maxRisk) {
        const newSteps = plan.steps
            .filter(s => s.estimatedRisk <= maxRisk)
            .map(s => ({
            ...s,
            dependencies: s.dependencies.filter(depId => plan.steps.some(ps => ps.id === depId && ps.estimatedRisk <= maxRisk)),
        }));
        const newGraph = rebuildGraph(newSteps);
        const totalRisk = newSteps.reduce((sum, s) => sum + s.estimatedRisk, 0);
        return clonePlan(plan, { steps: newSteps, graph: newGraph, estimatedTotalRisk: totalRisk });
    }
    splitStep(plan, stepId) {
        const step = plan.steps.find(s => s.id === stepId);
        if (!step)
            return clonePlan(plan);
        const halfRisk = Math.ceil(step.estimatedRisk / 2);
        const part1 = {
            ...step,
            id: `${step.id}-part1`,
            label: `${step.label} (part 1)`,
            estimatedRisk: halfRisk,
        };
        const part2 = {
            ...step,
            id: `${step.id}-part2`,
            label: `${step.label} (part 2)`,
            estimatedRisk: step.estimatedRisk - halfRisk,
            dependencies: [...step.dependencies, part1.id],
        };
        const newSteps = plan.steps.flatMap(s => {
            if (s.id === stepId)
                return [part1, part2];
            return [{
                    ...s,
                    dependencies: s.dependencies.map(d => d === stepId ? part2.id : d),
                }];
        });
        const newGraph = rebuildGraph(newSteps);
        const totalRisk = newSteps.reduce((sum, s) => sum + s.estimatedRisk, 0);
        return clonePlan(plan, { steps: newSteps, graph: newGraph, estimatedTotalRisk: totalRisk });
    }
    injectRecoveryStep(plan, afterStepId) {
        const afterStep = plan.steps.find(s => s.id === afterStepId);
        if (!afterStep)
            return clonePlan(plan);
        const recoveryStep = {
            id: `recovery-${afterStepId}-${Date.now()}`,
            goalId: afterStep.goalId,
            label: `Recovery checkpoint after: ${afterStep.label}`,
            estimatedRisk: 5,
            dependencies: [afterStepId],
            cognitiveMode: 'conservative',
            rollbackStrategy: 'revert',
        };
        // Insert after the target step; update steps that depended on afterStepId to depend on recovery
        const newSteps = plan.steps.map(s => {
            if (s.id === afterStepId)
                return { ...s };
            if (s.dependencies.includes(afterStepId)) {
                return { ...s, dependencies: s.dependencies.map(d => d === afterStepId ? recoveryStep.id : d) };
            }
            return { ...s };
        });
        newSteps.splice(newSteps.findIndex(s => s.id === afterStepId) + 1, 0, recoveryStep);
        const newGraph = rebuildGraph(newSteps);
        const totalRisk = newSteps.reduce((sum, s) => sum + s.estimatedRisk, 0);
        return clonePlan(plan, { steps: newSteps, graph: newGraph, estimatedTotalRisk: totalRisk });
    }
    abortPlan(plan) {
        const newSteps = plan.steps.map(s => ({ ...s }));
        return clonePlan(plan, {
            steps: newSteps,
            graph: rebuildGraph(newSteps),
            estimatedTotalRisk: 0,
        });
    }
}
exports.AdaptivePlanner = AdaptivePlanner;
//# sourceMappingURL=AdaptivePlanner.js.map