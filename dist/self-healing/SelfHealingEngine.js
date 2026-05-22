"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfHealingEngine = void 0;
const FailureRecoveryPlanner_js_1 = require("./FailureRecoveryPlanner.js");
class SelfHealingEngine {
    failureMemory;
    planner = new FailureRecoveryPlanner_js_1.FailureRecoveryPlanner();
    history = [];
    constructor(failureMemory) {
        this.failureMemory = failureMemory;
    }
    /**
     * Analyse a failed execution result and produce a recovery plan.
     * Never throws — healing failures are isolated from the main loop.
     */
    heal(result, signals, failureSeverity = 50) {
        try {
            const affectedArtifacts = result.plan.steps.flatMap(s => s.mutations.map(m => m.filePath));
            const knownPatterns = this.failureMemory
                ? this.failureMemory.search(undefined, undefined)
                : [];
            const plan = this.planner.plan(signals, affectedArtifacts, knownPatterns, failureSeverity);
            this.history.push({
                executionId: result.transformationId,
                plan,
                timestamp: Date.now(),
                resolved: false,
            });
            return plan;
        }
        catch {
            return {
                strategy: 'retry',
                confidence: 0.1,
                reason: 'SelfHealingEngine internal error — defaulting to retry',
            };
        }
    }
    markResolved(executionId) {
        const attempt = this.history.find(h => h.executionId === executionId);
        if (attempt)
            attempt.resolved = true;
    }
    getHistory() {
        return [...this.history];
    }
    unresolvedCount() {
        return this.history.filter(h => !h.resolved).length;
    }
}
exports.SelfHealingEngine = SelfHealingEngine;
//# sourceMappingURL=SelfHealingEngine.js.map