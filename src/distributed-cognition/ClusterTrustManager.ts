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

export class ClusterTrustManager {
  private nodeTrusts: Map<string, NodeTrust>;
  private partitionTrusts: Map<string, PartitionTrust>;
  private logicalClock: number;
  private splitBrainDetector?: SplitBrainDetector;

  constructor(splitBrainDetector?: SplitBrainDetector) {
    this.nodeTrusts = new Map();
    this.partitionTrusts = new Map();
    this.logicalClock = 0;
    this.splitBrainDetector = splitBrainDetector;
  }

  initNode(nodeId: string): void {
    this.logicalClock++;
    if (!this.nodeTrusts.has(nodeId)) {
      this.nodeTrusts.set(nodeId, {
        nodeId,
        trustScore: 1.0,
        failureCount: 0,
        isolationCount: 0,
        divergenceCount: 0,
        quarantined: false,
        lastUpdated: this.logicalClock,
      });
    }
  }

  updateNodeTrust(nodeId: string, delta: number): void {
    this.logicalClock++;
    const trust = this.nodeTrusts.get(nodeId);
    if (!trust) return;
    trust.trustScore = Math.min(1.0, Math.max(0.0, trust.trustScore + delta));
    trust.lastUpdated = this.logicalClock;
  }

  degradeUnstableNode(nodeId: string): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (trust) {
      trust.failureCount++;
    }
    this.updateNodeTrust(nodeId, -0.2);
    this.applyProgressiveDegradation(nodeId);
  }

  degradeIsolatedNode(nodeId: string): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (trust) {
      trust.isolationCount++;
    }
    this.updateNodeTrust(nodeId, -0.3);
    this.applyProgressiveDegradation(nodeId);
  }

  degradeDivergentNode(nodeId: string): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (trust) {
      trust.divergenceCount++;
    }
    this.updateNodeTrust(nodeId, -0.25);
    this.applyProgressiveDegradation(nodeId);
  }

  /** Apply alerts emitted by SplitBrainDetector into trust scores. */
  processTrustAlerts(alerts: TrustAlert[]): void {
    for (const alert of alerts) {
      for (const nodeId of alert.implicatedNodes) {
        if (!this.nodeTrusts.has(nodeId)) this.initNode(nodeId);

        switch (alert.recommendation) {
          case 'quarantine':
            this.quarantineNode(nodeId);
            break;
          case 'degrade':
            this.updateNodeTrust(nodeId, -0.15);
            break;
          case 'reconcile':
            this.updateNodeTrust(nodeId, -0.1);
            break;
          case 'monitor':
            // no trust change, flag only
            break;
        }
      }
    }
  }

  /** Quarantine a node: set trust to 0, mark quarantined flag. */
  quarantineNode(nodeId: string): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (!trust) return;
    trust.trustScore = 0.0;
    trust.quarantined = true;
    trust.lastUpdated = ++this.logicalClock;
    if (this.splitBrainDetector) {
      this.splitBrainDetector.quarantineNode(nodeId);
    }
  }

  /** Release a quarantined node, restoring minimum viable trust. */
  releaseNode(nodeId: string, recoveryTrust = 0.3): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (!trust) return;
    trust.quarantined = false;
    trust.trustScore = Math.max(trust.trustScore, recoveryTrust);
    trust.lastUpdated = ++this.logicalClock;
    if (this.splitBrainDetector) {
      this.splitBrainDetector.releaseNode(nodeId);
    }
  }

  isQuarantined(nodeId: string): boolean {
    return this.nodeTrusts.get(nodeId)?.quarantined ?? false;
  }

  getNodeTrust(nodeId: string): NodeTrust | undefined {
    return this.nodeTrusts.get(nodeId);
  }

  getGlobalClusterTrust(): number {
    if (this.nodeTrusts.size === 0) return 1.0;
    let sum = 0;
    for (const t of this.nodeTrusts.values()) {
      sum += t.trustScore;
    }
    return sum / this.nodeTrusts.size;
  }

  updatePartitionTrust(partitionId: string, nodeIds: string[]): void {
    this.logicalClock++;
    if (nodeIds.length === 0) {
      this.partitionTrusts.set(partitionId, {
        partitionId,
        nodeIds: [],
        averageTrust: 0,
        stable: false,
      });
      return;
    }
    let sum = 0;
    for (const id of nodeIds) {
      const t = this.nodeTrusts.get(id);
      sum += t ? t.trustScore : 0;
    }
    const avg = sum / nodeIds.length;
    this.partitionTrusts.set(partitionId, {
      partitionId,
      nodeIds: [...nodeIds],
      averageTrust: avg,
      stable: avg >= 0.5,
    });
  }

  getPartitionTrust(partitionId: string): PartitionTrust | undefined {
    return this.partitionTrusts.get(partitionId);
  }

  getUnstableNodes(threshold = 0.5): string[] {
    const result: string[] = [];
    for (const t of this.nodeTrusts.values()) {
      if (t.trustScore < threshold) result.push(t.nodeId);
    }
    return result;
  }

  getLowTrustNodes(threshold = 0.3): string[] {
    const result: string[] = [];
    for (const t of this.nodeTrusts.values()) {
      if (t.trustScore < threshold) result.push(t.nodeId);
    }
    return result;
  }

  getQuarantinedNodes(): string[] {
    const result: string[] = [];
    for (const t of this.nodeTrusts.values()) {
      if (t.quarantined) result.push(t.nodeId);
    }
    return result;
  }

  reset(): void {
    this.nodeTrusts.clear();
    this.partitionTrusts.clear();
    this.logicalClock = 0;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Progressive degradation: auto-quarantine nodes with repeated severe incidents. */
  private applyProgressiveDegradation(nodeId: string): void {
    const trust = this.nodeTrusts.get(nodeId);
    if (!trust || trust.quarantined) return;

    const totalIncidents = trust.failureCount + trust.isolationCount + trust.divergenceCount;
    if (trust.trustScore <= 0.1 || totalIncidents >= 10) {
      this.quarantineNode(nodeId);
    }
  }
}
