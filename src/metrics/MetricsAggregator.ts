import { CognitiveMetrics, type CognitiveHealthSnapshot } from './CognitiveMetrics.js';
import { RuntimeHealthMetrics } from './RuntimeHealthMetrics.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';

/**
 * Aggregates CognitiveMetrics + RuntimeHealthMetrics into a single observable surface.
 */
export class MetricsAggregator {
  readonly cognitive: CognitiveMetrics;
  readonly runtime: RuntimeHealthMetrics;

  constructor(cognitive?: CognitiveMetrics, runtime?: RuntimeHealthMetrics) {
    this.cognitive = cognitive ?? new CognitiveMetrics();
    this.runtime = runtime ?? new RuntimeHealthMetrics();
  }

  ingestSignals(signals: RuntimeSignal[]): void {
    this.runtime.ingestAll(signals);
  }

  recordExecution(opts: {
    success: boolean;
    hadRollback: boolean;
    retrievalHits: number;
    retrievalTotal: number;
    hadContradiction: boolean;
    runtimePassed: boolean;
    calibrationDelta: number;
    signals?: RuntimeSignal[];
  }): void {
    const { signals, ...cogObs } = opts;
    this.cognitive.record(cogObs);
    if (signals) this.runtime.ingestAll(signals);
  }

  cognitiveHealth(semanticConfidence?: number, recoverySuccessRate?: number): CognitiveHealthSnapshot {
    return this.cognitive.healthSnapshot(semanticConfidence, recoverySuccessRate);
  }

  overallStabilityScore(): number {
    const ch = this.cognitiveHealth();
    const rh = this.runtime.report().overallHealth;
    return (ch.stabilityScore + rh) / 2;
  }
}
