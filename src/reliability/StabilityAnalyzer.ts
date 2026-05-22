export interface StabilityReport {
  trustOscillation: number; // stddev of trust samples
  planningEntropy: number; // variance in planning outcomes
  retrievalDrift: number; // mean delta between retrieval quality samples
  replanFrequency: number; // replans per execution
  regressionDetected: boolean;
  instabilityDetected: boolean;
  notes: string[];
}

export class StabilityAnalyzer {
  private _trustHistory: number[] = [];
  private _planningHistory: number[] = [];
  private _retrievalHistory: number[] = [];
  private _replanEvents: number[] = [];
  private _executionCount = 0;

  recordTrust(score: number): void {
    this._trustHistory.push(score);
  }

  recordPlanningOutcome(score: number): void {
    this._planningHistory.push(score);
  }

  recordRetrievalQuality(score: number): void {
    this._retrievalHistory.push(score);
  }

  recordReplan(): void {
    this._replanEvents.push(Date.now());
  }

  recordExecution(): void {
    this._executionCount++;
  }

  analyze(): StabilityReport {
    const trustOscillation = this._stddev(this._trustHistory);
    const planningEntropy = this._variance(this._planningHistory);
    const retrievalDrift = this._drift(this._retrievalHistory);
    const replanFrequency = this._executionCount === 0
      ? 0
      : this._replanEvents.length / this._executionCount;

    const notes: string[] = [];
    if (trustOscillation > 0.3) notes.push('high trust oscillation');
    if (planningEntropy > 0.2) notes.push('high planning entropy');
    if (retrievalDrift > 0.2) notes.push('retrieval quality drifting');
    if (replanFrequency > 3) notes.push('excessive replanning frequency');

    return {
      trustOscillation,
      planningEntropy,
      retrievalDrift,
      replanFrequency,
      regressionDetected: this._detectRegression(),
      instabilityDetected: notes.length >= 2,
      notes,
    };
  }

  detectRegression(): boolean {
    return this._detectRegression();
  }

  detectInstability(): boolean {
    const report = this.analyze();
    return report.instabilityDetected;
  }

  private _detectRegression(): boolean {
    if (this._trustHistory.length < 4) return false;
    const recent = this._trustHistory.slice(-4);
    const older = this._trustHistory.slice(-8, -4);
    if (older.length === 0) return false;
    const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
    const olderMean = older.reduce((s, v) => s + v, 0) / older.length;
    return olderMean - recentMean > 0.15;
  }

  private _stddev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  }

  private _variance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  }

  private _drift(arr: number[]): number {
    if (arr.length < 2) return 0;
    let totalDelta = 0;
    for (let i = 1; i < arr.length; i++) {
      totalDelta += Math.abs(arr[i] - arr[i - 1]);
    }
    return totalDelta / (arr.length - 1);
  }

  reset(): void {
    this._trustHistory = [];
    this._planningHistory = [];
    this._retrievalHistory = [];
    this._replanEvents = [];
    this._executionCount = 0;
  }
}
