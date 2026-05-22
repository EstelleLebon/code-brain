"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategyMemory = void 0;
class StrategyMemory {
    records = [];
    recordStrategy(record) {
        this.records.push({ ...record });
    }
    bestStrategies(goalType) {
        return this.records
            .filter(r => r.goalType === goalType && r.success)
            .sort((a, b) => a.executionTimeMs - b.executionTimeMs);
    }
    failurePatterns(goalType) {
        return this.records.filter(r => r.goalType === goalType && !r.success);
    }
    averageSuccessRate(goalType) {
        const relevant = this.records.filter(r => r.goalType === goalType);
        if (relevant.length === 0)
            return 0;
        const successes = relevant.filter(r => r.success).length;
        return successes / relevant.length;
    }
}
exports.StrategyMemory = StrategyMemory;
//# sourceMappingURL=StrategyMemory.js.map