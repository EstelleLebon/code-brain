export interface ReliabilitySnapshot {
  timestamp: Date;
  meanRecoveryTimeMs: number;
  rollbackContainmentRate: number; // 0–1
  executionReproducibility: number; // 0–1
  snapshotIntegrity: number; // 0–1
  trustStability: number; // 0–1
  planningStability: number; // 0–1
  runtimeResilience: number; // 0–1
  overallScore: number; // weighted composite
}

export interface ReliabilityTrend {
  snapshots: ReliabilitySnapshot[];
  improving: boolean;
  degrading: boolean;
  delta: Partial<ReliabilitySnapshot>;
}

interface RecoveryRecord {
  durationMs: number;
  contained: boolean;
}

export class ReliabilityMetrics {
  private _recoveries: RecoveryRecord[] = [];
  private _snapshotChecks: boolean[] = [];
  private _replayChecks: boolean[] = [];
  private _trustSamples: number[] = [];
  private _planningSamples: number[] = [];
  private _runtimeSamples: number[] = [];
  private _history: ReliabilitySnapshot[] = [];

  recordRecovery(durationMs: number, contained: boolean): void {
    this._recoveries.push({ durationMs, contained });
  }

  recordSnapshotCheck(passed: boolean): void {
    this._snapshotChecks.push(passed);
  }

  recordReplayCheck(reproducible: boolean): void {
    this._replayChecks.push(reproducible);
  }

  recordTrustSample(score: number): void {
    this._trustSamples.push(Math.max(0, Math.min(1, score)));
  }

  recordPlanningSample(score: number): void {
    this._planningSamples.push(Math.max(0, Math.min(1, score)));
  }

  recordRuntimeSample(score: number): void {
    this._runtimeSamples.push(Math.max(0, Math.min(1, score)));
  }

  private _mean(arr: number[]): number {
    if (arr.length === 0) return 1;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  private _rate(arr: boolean[]): number {
    if (arr.length === 0) return 1;
    return arr.filter(Boolean).length / arr.length;
  }

  snapshot(): ReliabilitySnapshot {
    const meanRecoveryTimeMs = this._recoveries.length === 0
      ? 0
      : this._recoveries.reduce((s, r) => s + r.durationMs, 0) / this._recoveries.length;

    const rollbackContainmentRate = this._recoveries.length === 0
      ? 1
      : this._recoveries.filter(r => r.contained).length / this._recoveries.length;

    const executionReproducibility = this._rate(this._replayChecks);
    const snapshotIntegrity = this._rate(this._snapshotChecks);
    const trustStability = this._mean(this._trustSamples);
    const planningStability = this._mean(this._planningSamples);
    const runtimeResilience = this._mean(this._runtimeSamples);

    const overallScore = (
      rollbackContainmentRate * 0.2 +
      executionReproducibility * 0.2 +
      snapshotIntegrity * 0.15 +
      trustStability * 0.15 +
      planningStability * 0.15 +
      runtimeResilience * 0.15
    );

    const snap: ReliabilitySnapshot = {
      timestamp: new Date(),
      meanRecoveryTimeMs,
      rollbackContainmentRate,
      executionReproducibility,
      snapshotIntegrity,
      trustStability,
      planningStability,
      runtimeResilience,
      overallScore,
    };

    this._history.push(snap);
    return snap;
  }

  trend(): ReliabilityTrend {
    const snapshots = [...this._history];
    if (snapshots.length < 2) {
      return { snapshots, improving: false, degrading: false, delta: {} };
    }
    const last = snapshots[snapshots.length - 1];
    const prev = snapshots[snapshots.length - 2];
    const delta = last.overallScore - prev.overallScore;
    return {
      snapshots,
      improving: delta > 0.02,
      degrading: delta < -0.02,
      delta: { overallScore: delta },
    };
  }

  reset(): void {
    this._recoveries = [];
    this._snapshotChecks = [];
    this._replayChecks = [];
    this._trustSamples = [];
    this._planningSamples = [];
    this._runtimeSamples = [];
  }
}
