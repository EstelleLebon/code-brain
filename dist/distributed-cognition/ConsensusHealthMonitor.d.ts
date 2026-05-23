export interface ConsensusHealthSnapshot {
    quorumHealth: number;
    consensusLatency: number;
    voteStability: number;
    leaderStability: number;
    partitionPressure: number;
    timestamp: number;
}
export type ConsensusAnomaly = 'unstable_quorum' | 'consensus_oscillation' | 'repeated_split_brain' | 'leader_churn' | 'partition_pressure_high';
export declare class ConsensusHealthMonitor {
    private history;
    private logicalClock;
    constructor();
    recordSnapshot(partial: Omit<ConsensusHealthSnapshot, 'timestamp'>): void;
    getLatestSnapshot(): ConsensusHealthSnapshot | undefined;
    getHistory(): ConsensusHealthSnapshot[];
    detectAnomalies(): ConsensusAnomaly[];
    computeOverallHealth(): number;
    reset(): void;
}
//# sourceMappingURL=ConsensusHealthMonitor.d.ts.map