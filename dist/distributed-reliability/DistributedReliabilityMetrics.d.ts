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
export declare class DistributedReliabilityMetrics {
    private snapshots;
    private clock;
    private consensusVotes;
    private consensusSuccesses;
    private replicationAttempts;
    private replicationSuccesses;
    private recoveryAttempts;
    private recoverySuccesses;
    private partitionEvents;
    private partitionRecoveries;
    private coordinationEvents;
    private coordinationOverheadTicks;
    private replayAttempts;
    private replayConsistent;
    recordConsensusAttempt(success: boolean): void;
    recordReplication(success: boolean): void;
    recordRecovery(success: boolean): void;
    recordPartitionEvent(healed: boolean): void;
    recordCoordinationOverhead(ticks: number): void;
    recordReplayConsistency(consistent: boolean): void;
    snapshot(): DistributedMetricsSnapshot;
    getHistory(): readonly DistributedMetricsSnapshot[];
    getLatest(): DistributedMetricsSnapshot | undefined;
}
//# sourceMappingURL=DistributedReliabilityMetrics.d.ts.map