import { CalibrationResult } from './ConfidenceCalibration.js';
export interface CalibrationRecord {
    operationType: string;
    result: CalibrationResult;
    timestamp: number;
}
export declare class CalibrationMemory {
    private records;
    record(operationType: string, result: CalibrationResult): void;
    averageDelta(operationType: string): number | null;
    adjustedRisk(operationType: string, predictedRisk: number): number;
    forType(operationType: string): CalibrationRecord[];
    all(): CalibrationRecord[];
    clear(): void;
}
//# sourceMappingURL=CalibrationMemory.d.ts.map