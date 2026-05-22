"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningMetrics = void 0;
class PlanningMetrics {
    records = [];
    record(metric) {
        this.records.push({ ...metric });
    }
    summary() {
        if (this.records.length === 0) {
            return { avgSuccessRate: 0, avgReplanningFreq: 0, avgRollbackDepth: 0 };
        }
        const n = this.records.length;
        return {
            avgSuccessRate: this.records.reduce((s, r) => s + r.successRate, 0) / n,
            avgReplanningFreq: this.records.reduce((s, r) => s + r.replanningCount, 0) / n,
            avgRollbackDepth: this.records.reduce((s, r) => s + r.avgRollbackDepth, 0) / n,
        };
    }
    history() {
        return [...this.records];
    }
}
exports.PlanningMetrics = PlanningMetrics;
//# sourceMappingURL=PlanningMetrics.js.map