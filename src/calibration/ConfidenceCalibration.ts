export interface CalibrationResult {
  predictedRisk: number;
  observedRisk: number;
  calibrationDelta: number;
  direction: 'underestimated' | 'overestimated' | 'accurate';
}

const ACCURACY_THRESHOLD = 15;

export function calibrate(predictedRisk: number, observedRisk: number): CalibrationResult {
  const calibrationDelta = observedRisk - predictedRisk;
  const direction =
    Math.abs(calibrationDelta) <= ACCURACY_THRESHOLD
      ? 'accurate'
      : calibrationDelta > 0
        ? 'underestimated'
        : 'overestimated';
  return { predictedRisk, observedRisk, calibrationDelta, direction };
}
