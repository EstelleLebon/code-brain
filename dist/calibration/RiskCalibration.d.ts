import { CalibrationResult } from './ConfidenceCalibration.js';
import { CalibrationMemory } from './CalibrationMemory.js';
export declare class RiskCalibration {
    readonly memory: CalibrationMemory;
    observe(operationType: string, predictedRisk: number, observedRisk: number): CalibrationResult;
    predict(operationType: string, rawPrediction: number): number;
    summary(): Array<{
        operationType: string;
        averageDelta: number | null;
        sampleCount: number;
    }>;
}
//# sourceMappingURL=RiskCalibration.d.ts.map