"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningHeuristics = void 0;
class PlanningHeuristics {
    memory;
    constructor(memory) {
        this.memory = memory;
    }
    preferSmallPlans(goalType) {
        // True if high failure rate (instability detected)
        const successRate = this.memory.averageSuccessRate(goalType);
        const failures = this.memory.failurePatterns(goalType);
        return successRate < 0.5 || failures.length >= 3;
    }
    preferParallelism(goalType) {
        // True if stable history (high success rate with low rollback)
        const best = this.memory.bestStrategies(goalType);
        if (best.length === 0)
            return false;
        const avgRollback = best.reduce((s, r) => s + r.rollbackCount, 0) / best.length;
        return this.memory.averageSuccessRate(goalType) > 0.8 && avgRollback < 1;
    }
    isDangerousPattern(goalType, cognitiveMode) {
        const failures = this.memory.failurePatterns(goalType);
        const modeFailures = failures.filter(f => f.cognitiveMode === cognitiveMode);
        return modeFailures.length >= 2;
    }
    shouldReduceMutations(goalType) {
        const failures = this.memory.failurePatterns(goalType);
        if (failures.length === 0)
            return false;
        const avgRollback = failures.reduce((s, r) => s + r.rollbackCount, 0) / failures.length;
        return avgRollback > 2;
    }
}
exports.PlanningHeuristics = PlanningHeuristics;
//# sourceMappingURL=PlanningHeuristics.js.map