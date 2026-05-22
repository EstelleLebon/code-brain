"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnapshot = createSnapshot;
function createSnapshot(operationId, signals) {
    const summary = signals.reduce((acc, s) => {
        acc.total++;
        acc[s.status]++;
        return acc;
    }, { total: 0, success: 0, warning: 0, failure: 0 });
    return {
        id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        operationId,
        capturedAt: Date.now(),
        signals,
        summary,
    };
}
//# sourceMappingURL=RuntimeSignal.js.map