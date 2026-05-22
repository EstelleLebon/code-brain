export interface DistributedMetricsSnapshot {
  timestamp: number;
  consensusStability: number;
  replicationIntegrity: number;
  crossNodeRecoveryRate: number;
  partitionTolerance: number;
  coordinationOverhead: number;
  distributedReplayConsistency: number;
  overallScore: number;
}

export class DistributedReliabilityMetrics {
  private snapshots: DistributedMetricsSnapshot[] = [];
  private clock = 0;

  private consensusVotes = 0;
  private consensusSuccesses = 0;
  private replicationAttempts = 0;
  private replicationSuccesses = 0;
  private recoveryAttempts = 0;
  private recoverySuccesses = 0;
  private partitionEvents = 0;
  private partitionRecoveries = 0;
  private coordinationEvents = 0;
  private coordinationOverheadTicks = 0;
  private replayAttempts = 0;
  private replayConsistent = 0;

  recordConsensusAttempt(success: boolean): void {
    this.consensusVotes++;
    if (success) this.consensusSuccesses++;
  }

  recordReplication(success: boolean): void {
    this.replicationAttempts++;
    if (success) this.replicationSuccesses++;
  }

  recordRecovery(success: boolean): void {
    this.recoveryAttempts++;
    if (success) this.recoverySuccesses++;
  }

  recordPartitionEvent(healed: boolean): void {
    this.partitionEvents++;
    if (healed) this.partitionRecoveries++;
  }

  recordCoordinationOverhead(ticks: number): void {
    this.coordinationEvents++;
    this.coordinationOverheadTicks += ticks;
  }

  recordReplayConsistency(consistent: boolean): void {
    this.replayAttempts++;
    if (consistent) this.replayConsistent++;
  }

  snapshot(): DistributedMetricsSnapshot {
    const consensusStability = this.consensusVotes > 0 ? this.consensusSuccesses / this.consensusVotes : 1;
    const replicationIntegrity = this.replicationAttempts > 0 ? this.replicationSuccesses / this.replicationAttempts : 1;
    const crossNodeRecoveryRate = this.recoveryAttempts > 0 ? this.recoverySuccesses / this.recoveryAttempts : 1;
    const partitionTolerance = this.partitionEvents > 0 ? this.partitionRecoveries / this.partitionEvents : 1;
    const avgOverhead = this.coordinationEvents > 0 ? this.coordinationOverheadTicks / this.coordinationEvents : 0;
    const coordinationOverhead = Math.max(0, 1 - avgOverhead / 100);
    const distributedReplayConsistency = this.replayAttempts > 0 ? this.replayConsistent / this.replayAttempts : 1;

    const overallScore = (consensusStability + replicationIntegrity + crossNodeRecoveryRate + partitionTolerance + coordinationOverhead + distributedReplayConsistency) / 6;

    const snap: DistributedMetricsSnapshot = {
      timestamp: this.clock++,
      consensusStability,
      replicationIntegrity,
      crossNodeRecoveryRate,
      partitionTolerance,
      coordinationOverhead,
      distributedReplayConsistency,
      overallScore,
    };
    this.snapshots.push(snap);
    return snap;
  }

  getHistory(): readonly DistributedMetricsSnapshot[] { return this.snapshots; }
  getLatest(): DistributedMetricsSnapshot | undefined { return this.snapshots[this.snapshots.length - 1]; }
}
