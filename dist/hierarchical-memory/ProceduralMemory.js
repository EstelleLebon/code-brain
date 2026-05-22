"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProceduralMemory = void 0;
function makeId() {
    return `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
/**
 * Stores effective procedural strategies: which operation sequences work in which modes.
 */
class ProceduralMemory {
    patterns = [];
    record(name, mode, operationSequence, success, durationMs) {
        const existing = this.find(name, mode);
        if (existing) {
            const prevSuccesses = Math.round(existing.successRate * existing.executionCount);
            existing.executionCount++;
            existing.successRate = (prevSuccesses + (success ? 1 : 0)) / existing.executionCount;
            existing.avgDurationMs = (existing.avgDurationMs * (existing.executionCount - 1) + durationMs) / existing.executionCount;
            existing.lastUsed = Date.now();
            return existing;
        }
        const pattern = {
            id: makeId(),
            name,
            mode,
            operationSequence,
            successRate: success ? 1 : 0,
            executionCount: 1,
            avgDurationMs: durationMs,
            lastUsed: Date.now(),
        };
        this.patterns.push(pattern);
        return pattern;
    }
    find(name, mode) {
        return this.patterns.find(p => p.name === name && p.mode === mode);
    }
    bestForMode(mode, limit = 5) {
        return this.patterns
            .filter(p => p.mode === mode && p.executionCount >= 2)
            .sort((a, b) => b.successRate - a.successRate || b.executionCount - a.executionCount)
            .slice(0, limit);
    }
    all() {
        return [...this.patterns];
    }
}
exports.ProceduralMemory = ProceduralMemory;
//# sourceMappingURL=ProceduralMemory.js.map