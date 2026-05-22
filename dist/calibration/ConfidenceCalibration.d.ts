export interface CalibrationResult {
    predictedRisk: number;
    observedRisk: number;
    calibrationDelta: number;
    direction: 'underestimated' | 'overestimated' | 'accurate';
}
export declare function calibrate(predictedRisk: number, observedRisk: number): CalibrationResult;
//# sourceMappingURL=ConfidenceCalibration.d.ts.map