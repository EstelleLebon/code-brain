export interface PlanMetricRecord {
  planId: string;
  successRate: number;
  replanningCount: number;
  avgRollbackDepth: number;
  avgExecutionDepth: number;
  adaptiveRecoverySuccess: number;
  plannerConfidence: number;
  graphComplexity: number;
  timestamp: Date;
}

export class PlanningMetrics {
  private records: PlanMetricRecord[] = [];

  record(metric: PlanMetricRecord): void {
    this.records.push({ ...metric });
  }

  summary(): { avgSuccessRate: number; avgReplanningFreq: number; avgRollbackDepth: number } {
    if (this.records.length === 0) {
      return { avgSuccessRate: 0, avgReplanningFreq: 0, avgRollbackDepth: 0 };
    }
    const n = this.records.length;
    return {
      avgSuccessRate: this.records.reduce((s, r) => s + r.successRate, 0) / n,
      avgReplanningFreq: this.records.reduce((s, r) => s + r.replanningCount, 0) / n,
      avgRollbackDepth: this.records.reduce((s, r) => s + r.avgRollbackDepth, 0) / n,
    };
  }

  history(): PlanMetricRecord[] {
    return [...this.records];
  }
}
