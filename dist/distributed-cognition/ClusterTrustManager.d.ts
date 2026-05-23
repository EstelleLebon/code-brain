import type { SplitBrainDetector, TrustAlert } from '../distributed-reliability/SplitBrainDetector.js';
export interface NodeTrust {
    nodeId: string;
    trustScore: number;
    failureCount: number;
    isolationCount: number;
    divergenceCount: number;
    quarantined: boolean;
    lastUpdated: number;
}
export interface PartitionTrust {
    partitionId: string;
    nodeIds: string[];
    averageTrust: number;
    stable: boolean;
}
export declare class ClusterTrustManager {
    private nodeTrusts;
    private partitionTrusts;
    private logicalClock;
    private splitBrainDetector?;
    constructor(splitBrainDetector?: SplitBrainDetector);
    initNode(nodeId: string): void;
    updateNodeTrust(nodeId: string, delta: number): void;
    degradeUnstableNode(nodeId: string): void;
    degradeIsolatedNode(nodeId: string): void;
    degradeDivergentNode(nodeId: string): void;
    /** Apply alerts emitted by SplitBrainDetector into trust scores. */
    processTrustAlerts(alerts: TrustAlert[]): void;
    /** Quarantine a node: set trust to 0, mark quarantined flag. */
    quarantineNode(nodeId: string): void;
    /** Release a quarantined node, restoring minimum viable trust. */
    releaseNode(nodeId: string, recoveryTrust?: number): void;
    isQuarantined(nodeId: string): boolean;
    getNodeTrust(nodeId: string): NodeTrust | undefined;
    getGlobalClusterTrust(): number;
    updatePartitionTrust(partitionId: string, nodeIds: string[]): void;
    getPartitionTrust(partitionId: string): PartitionTrust | undefined;
    getUnstableNodes(threshold?: number): string[];
    getLowTrustNodes(threshold?: number): string[];
    getQuarantinedNodes(): string[];
    reset(): void;
    /** Progressive degradation: auto-quarantine nodes with repeated severe incidents. */
    private applyProgressiveDegradation;
}
//# sourceMappingURL=ClusterTrustManager.d.ts.map