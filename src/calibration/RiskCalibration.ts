import { calibrate, CalibrationResult } from './ConfidenceCalibration.js';
import { CalibrationMemory } from './CalibrationMemory.js';

export class RiskCalibration {
  readonly memory = new CalibrationMemory();

  observe(operationType: string, predictedRisk: number, observedRisk: number): CalibrationResult {
    const result = calibrate(predictedRisk, observedRisk);
    this.memory.record(operationType, result);
    return result;
  }

  predict(operationType: string, rawPrediction: number): number {
    return this.memory.adjustedRisk(operationType, rawPrediction);
  }

  summary(): Array<{
    operationType: string;
    averageDelta: number | null;
    sampleCount: number;
  }> {
    const types = [...new Set(this.memory.all().map(r => r.operationType))];
    return types.map(t => ({
      operationType: t,
      averageDelta: this.memory.averageDelta(t),
      sampleCount: this.memory.forType(t).length,
    }));
  }
}
