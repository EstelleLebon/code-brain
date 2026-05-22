"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalibrationMemory = void 0;
class CalibrationMemory {
    records = [];
    record(operationType, result) {
        this.records.push({ operationType, result, timestamp: Date.now() });
    }
    averageDelta(operationType) {
        const matching = this.records.filter(r => r.operationType === operationType);
        if (matching.length === 0)
            return null;
        const sum = matching.reduce((acc, r) => acc + r.result.calibrationDelta, 0);
        return sum / matching.length;
    }
    adjustedRisk(operationType, predictedRisk) {
        const avg = this.averageDelta(operationType);
        if (avg === null)
            return predictedRisk;
        return Math.max(0, Math.min(100, predictedRisk + avg));
    }
    forType(operationType) {
        return this.records.filter(r => r.operationType === operationType);
    }
    all() {
        return [...this.records];
    }
    clear() {
        this.records = [];
    }
}
exports.CalibrationMemory = CalibrationMemory;
//# sourceMappingURL=CalibrationMemory.js.map