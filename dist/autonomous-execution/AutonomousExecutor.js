"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousExecutor = void 0;
const node_events_1 = require("node:events");
class AutonomousExecutor extends node_events_1.EventEmitter {
    planner;
    checkpoints;
    _paused = false;
    _aborted = false;
    _resumeResolve = null;
    constructor(planner, checkpoints) {
        super();
        this.planner = planner;
        this.checkpoints = checkpoints;
    }
    async execute(plan, options = {}) {
        this._paused = false;
        this._aborted = false;
        const state = {
            planId: plan.id,
            completedSteps: [],
            failedSteps: [],
            rolledBackSteps: [],
        };
        let currentPlan = plan;
        const results = [];
        const rollbackPoints = [];
        this._emit({ type: 'started', planId: plan.id });
        let sortedSteps = currentPlan.graph.topologicalSort();
        for (const node of sortedSteps) {
            if (this._aborted) {
                this._emit({ type: 'aborted', planId: currentPlan.id });
                break;
            }
            await this._waitIfPaused();
            if (this._aborted)
                break;
            const step = currentPlan.steps.find(s => s.id === node.id);
            if (!step)
                continue;
            state.currentStepId = step.id;
            this._emit({ type: 'step:start', stepId: step.id, planId: currentPlan.id });
            try {
                if (!options.dryRun) {
                    // Simulate actual execution with a small async operation
                    await Promise.resolve();
                }
                // Record rollback point
                rollbackPoints.push({
                    stepId: step.id,
                    snapshotAt: new Date(),
                    stateSnapshot: { completedSteps: [...state.completedSteps] },
                });
                state.completedSteps.push(step.id);
                this._emit({ type: 'step:complete', stepId: step.id, planId: currentPlan.id });
                // Checkpoint every 5 steps
                if (state.completedSteps.length % 5 === 0) {
                    this.checkpoints.save(state, rollbackPoints);
                }
            }
            catch (err) {
                state.failedSteps.push(step.id);
                this._emit({ type: 'step:failed', stepId: step.id, planId: currentPlan.id, data: err });
                if (step.rollbackStrategy === 'abort') {
                    this._emit({ type: 'aborted', planId: currentPlan.id });
                    break;
                }
                if (step.rollbackStrategy === 'revert' || step.rollbackStrategy === 'compensate') {
                    // Partial rollback: roll back descendants
                    const descendants = currentPlan.graph.descendants(step.id).map(n => n.id);
                    for (const descId of descendants) {
                        if (state.completedSteps.includes(descId)) {
                            state.completedSteps.splice(state.completedSteps.indexOf(descId), 1);
                            state.rolledBackSteps.push(descId);
                        }
                    }
                }
                // Replan
                this._emit({ type: 'replanning', planId: currentPlan.id });
                currentPlan = this.planner.replan(currentPlan, step.id, err);
                sortedSteps = currentPlan.graph.topologicalSort();
            }
        }
        // Build goal results
        for (const goal of plan.goals) {
            const goalSteps = plan.steps.filter(s => s.goalId === goal.id);
            const completed = goalSteps.filter(s => state.completedSteps.includes(s.id)).length;
            const failed = goalSteps.filter(s => state.failedSteps.includes(s.id)).length;
            let outcome = 'success';
            let status = 'completed';
            if (failed > 0 && completed === 0) {
                outcome = 'failure';
                status = 'failed';
            }
            else if (failed > 0) {
                outcome = 'partial';
                status = 'completed';
            }
            results.push({
                goalId: goal.id,
                status,
                completedAt: new Date(),
                stepsExecuted: completed,
                stepsRolledBack: goalSteps.filter(s => state.rolledBackSteps.includes(s.id)).length,
                finalRisk: goal.constraints.maxRisk ?? 30,
                outcome,
                notes: options.dryRun ? ['dry-run mode'] : [],
            });
        }
        this._emit({ type: 'completed', planId: currentPlan.id, data: results });
        // Final checkpoint
        this.checkpoints.save(state, rollbackPoints);
        return results;
    }
    pause() {
        this._paused = true;
    }
    resume() {
        this._paused = false;
        if (this._resumeResolve) {
            this._resumeResolve();
            this._resumeResolve = null;
        }
    }
    abort() {
        this._aborted = true;
        if (this._paused)
            this.resume();
    }
    _emit(event) {
        const e = { ...event, timestamp: new Date() };
        this.emit(event.type, e);
    }
    _waitIfPaused() {
        if (!this._paused)
            return Promise.resolve();
        return new Promise(resolve => {
            this._resumeResolve = resolve;
        });
    }
}
exports.AutonomousExecutor = AutonomousExecutor;
//# sourceMappingURL=AutonomousExecutor.js.map