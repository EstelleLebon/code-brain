"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessPatternMemory = void 0;
function makeId() {
    return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function overlapScore(a, b) {
    if (a.length === 0 || b.length === 0)
        return 0;
    const setB = new Set(b);
    return a.filter(x => setB.has(x)).length / Math.max(a.length, b.length);
}
/**
 * Symmetric counterpart to FailureMemory: tracks successful transformations
 * to reinforce stable, low-risk operation patterns.
 */
class SuccessPatternMemory {
    patterns = [];
    record(operationType, structuralContext, observedRisk) {
        const existing = this.findSimilar(operationType, structuralContext);
        if (existing) {
            existing.successCount++;
            existing.lastSeen = Date.now();
            existing.averageRisk = (existing.averageRisk * (existing.successCount - 1) + observedRisk) / existing.successCount;
            return existing;
        }
        const pattern = {
            id: makeId(),
            operationType,
            structuralContext: [...structuralContext],
            successCount: 1,
            averageRisk: observedRisk,
            lastSeen: Date.now(),
        };
        this.patterns.push(pattern);
        return pattern;
    }
    findSimilar(operationType, context, threshold = 0.6) {
        return this.patterns.find(p => p.operationType === operationType && overlapScore(p.structuralContext, context) >= threshold);
    }
    getAll() { return [...this.patterns]; }
    topBySuccessRate(limit = 10) {
        return [...this.patterns]
            .sort((a, b) => b.successCount - a.successCount)
            .slice(0, limit);
    }
}
exports.SuccessPatternMemory = SuccessPatternMemory;
//# sourceMappingURL=SuccessPatternMemory.js.map