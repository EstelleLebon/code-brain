import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';
export type SplitBrainSeverity = 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
export interface SplitBrainDetection {
    detectionId: string;
    detectedAt: number;
    severity: SplitBrainSeverity;
    divergedNodes: string[][];
    divergenceType: 'memory_divergence' | 'consensus_inconsistency' | 'event_fork' | 'replay_mismatch';
    resolved: boolean;
}
export type TrustAlertKind = 'fingerprint_divergence' | 'majority_inconsistency' | 'replay_incompatibility' | 'memory_version_skew' | 'quorum_break';
export interface TrustAlert {
    alertId: string;
    kind: TrustAlertKind;
    severity: SplitBrainSeverity;
    /** Nodes implicated in the alert, grouped by partition if applicable. */
    implicatedNodes: string[];
    /** Recommended action: degrade, quarantine, reconcile, or monitor. */
    recommendation: 'degrade' | 'quarantine' | 'reconcile' | 'monitor';
    detectedAt: number;
    resolved: boolean;
}
export declare class SplitBrainDetector {
    private bus;
    private detections;
    private alerts;
    private nodeMemoryVersions;
    private nodeFingerprints;
    private replayTraces;
    private quarantinedNodes;
    private clock;
    constructor(bus: DistributedEventBus);
    updateNodeVersion(nodeId: string, version: number): void;
    /** Register a deterministic fingerprint (no crypto — caller computes from logical state). */
    updateNodeFingerprint(nodeId: string, fingerprint: string): void;
    /** Register ordered replay event IDs for a node's last execution. */
    updateReplayTrace(nodeId: string, eventIds: string[]): void;
    quarantineNode(nodeId: string): void;
    releaseNode(nodeId: string): void;
    isQuarantined(nodeId: string): boolean;
    getQuarantinedNodes(): string[];
    detect(): SplitBrainDetection[];
    /** Detect nodes with diverging deterministic fingerprints. */
    detectFingerprintDivergence(): TrustAlert[];
    /** Detect majority inconsistency — when no fingerprint group holds quorum. */
    detectMajorityInconsistency(totalNodes: number): TrustAlert[];
    /** Detect replay incompatibility — two nodes with different event orderings. */
    detectReplayIncompatibility(): TrustAlert[];
    getAlerts(): readonly TrustAlert[];
    getUnresolvedAlerts(): TrustAlert[];
    resolveAlert(alertId: string): void;
    resolve(detectionId: string): void;
    severity(detectionId: string): SplitBrainSeverity;
    getDetections(): readonly SplitBrainDetection[];
    getUnresolved(): SplitBrainDetection[];
    reset(): void;
    private emitAlert;
    private computeSeverity;
    private checkConsistency;
    private checkMemoryDivergence;
}
//# sourceMappingURL=SplitBrainDetector.d.ts.map