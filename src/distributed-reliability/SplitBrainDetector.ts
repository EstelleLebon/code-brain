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

export class SplitBrainDetector {
  private detections: SplitBrainDetection[] = [];
  private nodeMemoryVersions: Map<string, number> = new Map();
  private clock = 0;

  constructor(private bus: DistributedEventBus) {
    this.bus.subscribe('consensus_resolved', () => this.checkConsistency());
    this.bus.subscribe('memory_replicated', () => this.checkMemoryDivergence());
  }

  updateNodeVersion(nodeId: string, version: number): void {
    this.nodeMemoryVersions.set(nodeId, version);
  }

  detect(): SplitBrainDetection[] {
    const detections: SplitBrainDetection[] = [];

    const versions = [...this.nodeMemoryVersions.entries()];
    if (versions.length >= 2) {
      const maxVersion = Math.max(...versions.map(([, v]) => v));
      const minVersion = Math.min(...versions.map(([, v]) => v));

      if (maxVersion - minVersion > 5) {
        const ahead = versions.filter(([, v]) => v > minVersion + 2).map(([id]) => id);
        const behind = versions.filter(([, v]) => v <= minVersion + 2).map(([id]) => id);

        const severity = this.computeSeverity(maxVersion - minVersion);
        const detection: SplitBrainDetection = {
          detectionId: `sbd-${this.clock++}`,
          detectedAt: this.clock,
          severity,
          divergedNodes: [ahead, behind],
          divergenceType: 'memory_divergence',
          resolved: false,
        };
        detections.push(detection);
        this.detections.push(detection);
      }
    }

    return detections;
  }

  resolve(detectionId: string): void {
    const d = this.detections.find(x => x.detectionId === detectionId);
    if (d) d.resolved = true;
  }

  severity(detectionId: string): SplitBrainSeverity {
    return this.detections.find(x => x.detectionId === detectionId)?.severity ?? 'none';
  }

  private computeSeverity(delta: number): SplitBrainSeverity {
    if (delta <= 0) return 'none';
    if (delta <= 3) return 'mild';
    if (delta <= 10) return 'moderate';
    if (delta <= 25) return 'severe';
    return 'critical';
  }

  private checkConsistency(): void { /* event-driven hook */ }
  private checkMemoryDivergence(): void { /* event-driven hook */ }

  getDetections(): readonly SplitBrainDetection[] { return this.detections; }
  getUnresolved(): SplitBrainDetection[] { return this.detections.filter(d => !d.resolved); }
}
