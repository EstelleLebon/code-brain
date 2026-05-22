"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskCalibration = void 0;
const ConfidenceCalibration_js_1 = require("./ConfidenceCalibration.js");
const CalibrationMemory_js_1 = require("./CalibrationMemory.js");
class RiskCalibration {
    memory = new CalibrationMemory_js_1.CalibrationMemory();
    observe(operationType, predictedRisk, observedRisk) {
        const result = (0, ConfidenceCalibration_js_1.calibrate)(predictedRisk, observedRisk);
        this.memory.record(operationType, result);
        return result;
    }
    predict(operationType, rawPrediction) {
        return this.memory.adjustedRisk(operationType, rawPrediction);
    }
    summary() {
        const types = [...new Set(this.memory.all().map(r => r.operationType))];
        return types.map(t => ({
            operationType: t,
            averageDelta: this.memory.averageDelta(t),
            sampleCount: this.memory.forType(t).length,
        }));
    }
}
exports.RiskCalibration = RiskCalibration;
//# sourceMappingURL=RiskCalibration.js.map