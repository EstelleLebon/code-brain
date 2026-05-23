export interface DistributedFingerprintComponents {
    topologyHash: string;
    nodeAllocationHash: string;
    consensusDecisionsHash: string;
    replicationHash: string;
    replayHash: string;
}
export interface DistributedExecutionFingerprintData {
    executionId: string;
    components: DistributedFingerprintComponents;
    hash: string;
}
export interface DistributedFingerprintDiff {
    match: boolean;
    differences: Array<{
        component: string;
        a: string;
        b: string;
    }>;
}
export declare function diffDistributedFingerprints(a: DistributedExecutionFingerprintData, b: DistributedExecutionFingerprintData): DistributedFingerprintDiff;
export declare class DistributedExecutionFingerprint {
    private executionId;
    constructor(executionId: string);
    computeTopologyHash(nodeIds: string[]): string;
    computeNodeAllocationHash(allocations: Array<{
        nodeId: string;
        role: string;
    }>): string;
    computeConsensusDecisionsHash(decisions: Array<{
        round: number;
        outcome: string;
    }>): string;
    computeReplicationHash(entries: Array<{
        key: string;
        version: number;
    }>): string;
    computeReplayHash(eventIds: string[]): string;
    compute(nodeIds: string[], allocations: Array<{
        nodeId: string;
        role: string;
    }>, decisions: Array<{
        round: number;
        outcome: string;
    }>, replicationEntries: Array<{
        key: string;
        version: number;
    }>, replayEventIds: string[]): DistributedExecutionFingerprintData;
}
//# sourceMappingURL=DistributedExecutionFingerprint.d.ts.map