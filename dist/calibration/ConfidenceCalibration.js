"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calibrate = calibrate;
const ACCURACY_THRESHOLD = 15;
function calibrate(predictedRisk, observedRisk) {
    const calibrationDelta = observedRisk - predictedRisk;
    const direction = Math.abs(calibrationDelta) <= ACCURACY_THRESHOLD
        ? 'accurate'
        : calibrationDelta > 0
            ? 'underestimated'
            : 'overestimated';
    return { predictedRisk, observedRisk, calibrationDelta, direction };
}
//# sourceMappingURL=ConfidenceCalibration.js.map