export interface CognitiveMetricsSnapshot {
  retrievalPrecision: number;    // 0-1: fraction of retrieved chunks used in successful executions
  contradictionRate: number;     // 0-1: fraction of checks that found contradictions
  rollbackFrequency: number;     // 0-1: fraction of executions that triggered rollback
  learningVelocity: number;      // observations per minute over last window
  calibrationDrift: number;      // avg |predictedRisk - observedRisk|
  runtimeStability: number;      // 0-1: fraction of runtime checks passing
  semanticConfidence: number;    // 0-1: mean trust state confidence
  recoverySuccessRate: number;   // 0-1: fraction of healed executions that resolved
  capturedAt: number;
}

export interface CognitiveHealthSnapshot {
  memoryHealth: number;
  runtimeHealth: number;
  trustHealth: number;
  learningHealth: number;
  retrievalHealth: number;
  stabilityScore: number;
}

export class CognitiveMetrics {
  private observations: Array<{
    success: boolean;
    hadRollback: boolean;
    retrievalHits: number;
    retrievalTotal: number;
    hadContradiction: boolean;
    runtimePassed: boolean;
    calibrationDelta: number;
    timestamp: number;
  }> = [];

  private readonly windowSize: number;

  constructor(windowSize = 50) {
    this.windowSize = windowSize;
  }

  record(obs: {
    success: boolean;
    hadRollback: boolean;
    retrievalHits: number;
    retrievalTotal: number;
    hadContradiction: boolean;
    runtimePassed: boolean;
    calibrationDelta: number;
  }): void {
    this.observations.push({ ...obs, timestamp: Date.now() });
    if (this.observations.length > this.windowSize) this.observations.shift();
  }

  snapshot(semanticConfidence = 0.5, recoverySuccessRate = 1): CognitiveMetricsSnapshot {
    const n = this.observations.length;
    if (n === 0) {
      return {
        retrievalPrecision: 0.5, contradictionRate: 0, rollbackFrequency: 0,
        learningVelocity: 0, calibrationDrift: 0, runtimeStability: 1,
        semanticConfidence, recoverySuccessRate, capturedAt: Date.now(),
      };
    }

    const retrievalPrecision = this.observations.reduce(
      (sum, o) => sum + (o.retrievalTotal > 0 ? o.retrievalHits / o.retrievalTotal : 0.5), 0
    ) / n;

    const contradictionRate = this.observations.filter(o => o.hadContradiction).length / n;
    const rollbackFrequency = this.observations.filter(o => o.hadRollback).length / n;
    const runtimeStability = this.observations.filter(o => o.runtimePassed).length / n;
    const calibrationDrift = this.observations.reduce((sum, o) => sum + Math.abs(o.calibrationDelta), 0) / n;

    // Learning velocity: observations per minute in last window
    const windowMs = n > 1
      ? this.observations[n - 1].timestamp - this.observations[0].timestamp
      : 60_000;
    const learningVelocity = windowMs > 0 ? (n / (windowMs / 60_000)) : 0;

    return {
      retrievalPrecision, contradictionRate, rollbackFrequency,
      learningVelocity, calibrationDrift, runtimeStability,
      semanticConfidence, recoverySuccessRate, capturedAt: Date.now(),
    };
  }

  healthSnapshot(semanticConfidence = 0.5, recoverySuccessRate = 1): CognitiveHealthSnapshot {
    const m = this.snapshot(semanticConfidence, recoverySuccessRate);
    return {
      memoryHealth: 1 - m.contradictionRate,
      runtimeHealth: m.runtimeStability,
      trustHealth: m.semanticConfidence,
      learningHealth: Math.min(1, m.learningVelocity / 10),
      retrievalHealth: m.retrievalPrecision,
      stabilityScore: (m.runtimeStability + (1 - m.rollbackFrequency) + m.retrievalPrecision) / 3,
    };
  }
}
