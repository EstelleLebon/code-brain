import { CalibrationResult } from './ConfidenceCalibration.js';

export interface CalibrationRecord {
  operationType: string;
  result: CalibrationResult;
  timestamp: number;
}

export class CalibrationMemory {
  private records: CalibrationRecord[] = [];

  record(operationType: string, result: CalibrationResult): void {
    this.records.push({ operationType, result, timestamp: Date.now() });
  }

  averageDelta(operationType: string): number | null {
    const matching = this.records.filter(r => r.operationType === operationType);
    if (matching.length === 0) return null;
    const sum = matching.reduce((acc, r) => acc + r.result.calibrationDelta, 0);
    return sum / matching.length;
  }

  adjustedRisk(operationType: string, predictedRisk: number): number {
    const avg = this.averageDelta(operationType);
    if (avg === null) return predictedRisk;
    return Math.max(0, Math.min(100, predictedRisk + avg));
  }

  forType(operationType: string): CalibrationRecord[] {
    return this.records.filter(r => r.operationType === operationType);
  }

  all(): CalibrationRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}
