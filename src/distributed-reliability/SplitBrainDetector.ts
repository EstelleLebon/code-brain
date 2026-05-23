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

export type TrustAlertKind =
  | 'fingerprint_divergence'
  | 'majority_inconsistency'
  | 'replay_incompatibility'
  | 'memory_version_skew'
  | 'quorum_break';

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

export class SplitBrainDetector {
  private detections: SplitBrainDetection[] = [];
  private alerts: TrustAlert[] = [];
  private nodeMemoryVersions: Map<string, number> = new Map();
  private nodeFingerprints: Map<string, string> = new Map();
  private replayTraces: Map<string, string[]> = new Map();
  private quarantinedNodes: Set<string> = new Set();
  private clock = 0;

  constructor(private bus: DistributedEventBus) {
    this.bus.subscribe('consensus_resolved', () => this.checkConsistency());
    this.bus.subscribe('memory_replicated', () => this.checkMemoryDivergence());
  }

  updateNodeVersion(nodeId: string, version: number): void {
    this.nodeMemoryVersions.set(nodeId, version);
  }

  /** Register a deterministic fingerprint (no crypto — caller computes from logical state). */
  updateNodeFingerprint(nodeId: string, fingerprint: string): void {
    this.nodeFingerprints.set(nodeId, fingerprint);
  }

  /** Register ordered replay event IDs for a node's last execution. */
  updateReplayTrace(nodeId: string, eventIds: string[]): void {
    this.replayTraces.set(nodeId, [...eventIds]);
  }

  quarantineNode(nodeId: string): void {
    this.quarantinedNodes.add(nodeId);
  }

  releaseNode(nodeId: string): void {
    this.quarantinedNodes.delete(nodeId);
  }

  isQuarantined(nodeId: string): boolean {
    return this.quarantinedNodes.has(nodeId);
  }

  getQuarantinedNodes(): string[] {
    return [...this.quarantinedNodes];
  }

  // ── Core detection ─────────────────────────────────────────────────────────

  detect(): SplitBrainDetection[] {
    const detected: SplitBrainDetection[] = [];

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
        detected.push(detection);
        this.detections.push(detection);

        this.emitAlert({
          kind: 'memory_version_skew',
          severity,
          implicatedNodes: [...ahead, ...behind],
          recommendation: severity === 'critical' ? 'quarantine' : 'reconcile',
        });
      }
    }

    return detected;
  }

  /** Detect nodes with diverging deterministic fingerprints. */
  detectFingerprintDivergence(): TrustAlert[] {
    const emitted: TrustAlert[] = [];
    const fingerprints = [...this.nodeFingerprints.entries()];
    if (fingerprints.length < 2) return emitted;

    const groups = new Map<string, string[]>();
    for (const [nodeId, fp] of fingerprints) {
      const bucket = groups.get(fp) ?? [];
      bucket.push(nodeId);
      groups.set(fp, bucket);
    }

    if (groups.size <= 1) return emitted;

    // Multiple fingerprint groups = divergence
    const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length);
    const majority = sortedGroups[0];
    const minorities = sortedGroups.slice(1).flat();

    const divergenceRatio = minorities.length / fingerprints.length;
    const severity = divergenceRatio >= 0.5 ? 'severe' : divergenceRatio >= 0.33 ? 'moderate' : 'mild';

    const alert = this.emitAlert({
      kind: 'fingerprint_divergence',
      severity,
      implicatedNodes: minorities,
      recommendation: severity === 'severe' ? 'quarantine' : 'degrade',
    });
    emitted.push(alert);

    // Also record as split-brain detection
    this.detections.push({
      detectionId: `sbd-${this.clock++}`,
      detectedAt: this.clock,
      severity,
      divergedNodes: [majority, minorities],
      divergenceType: 'consensus_inconsistency',
      resolved: false,
    });

    return emitted;
  }

  /** Detect majority inconsistency — when no fingerprint group holds quorum. */
  detectMajorityInconsistency(totalNodes: number): TrustAlert[] {
    const emitted: TrustAlert[] = [];
    const fingerprints = [...this.nodeFingerprints.entries()];
    if (fingerprints.length < 2) return emitted;

    const groups = new Map<string, string[]>();
    for (const [nodeId, fp] of fingerprints) {
      const bucket = groups.get(fp) ?? [];
      bucket.push(nodeId);
      groups.set(fp, bucket);
    }

    const quorum = Math.floor(totalNodes / 2) + 1;
    const hasQuorum = [...groups.values()].some(g => g.length >= quorum);
    if (hasQuorum) return emitted;

    const all = fingerprints.map(([id]) => id);
    const alert = this.emitAlert({
      kind: 'majority_inconsistency',
      severity: 'critical',
      implicatedNodes: all,
      recommendation: 'quarantine',
    });
    emitted.push(alert);

    this.detections.push({
      detectionId: `sbd-${this.clock++}`,
      detectedAt: this.clock,
      severity: 'critical',
      divergedNodes: [...groups.values()],
      divergenceType: 'event_fork',
      resolved: false,
    });

    return emitted;
  }

  /** Detect replay incompatibility — two nodes with different event orderings. */
  detectReplayIncompatibility(): TrustAlert[] {
    const emitted: TrustAlert[] = [];
    const traces = [...this.replayTraces.entries()];
    if (traces.length < 2) return emitted;

    const incompatible: string[] = [];
    const [referenceId, referenceTrace] = traces[0];
    const referenceKey = referenceTrace.join(',');

    for (let i = 1; i < traces.length; i++) {
      const [nodeId, trace] = traces[i];
      if (trace.join(',') !== referenceKey) {
        incompatible.push(nodeId);
      }
    }

    if (incompatible.length === 0) return emitted;

    const ratio = incompatible.length / traces.length;
    const severity = ratio >= 0.5 ? 'severe' : 'moderate';

    const alert = this.emitAlert({
      kind: 'replay_incompatibility',
      severity,
      implicatedNodes: [referenceId, ...incompatible],
      recommendation: 'reconcile',
    });
    emitted.push(alert);

    this.detections.push({
      detectionId: `sbd-${this.clock++}`,
      detectedAt: this.clock,
      severity,
      divergedNodes: [[referenceId], incompatible],
      divergenceType: 'replay_mismatch',
      resolved: false,
    });

    return emitted;
  }

  // ── Alert management ───────────────────────────────────────────────────────

  getAlerts(): readonly TrustAlert[] {
    return this.alerts;
  }

  getUnresolvedAlerts(): TrustAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  resolveAlert(alertId: string): void {
    const a = this.alerts.find(x => x.alertId === alertId);
    if (a) a.resolved = true;
  }

  resolve(detectionId: string): void {
    const d = this.detections.find(x => x.detectionId === detectionId);
    if (d) d.resolved = true;
  }

  severity(detectionId: string): SplitBrainSeverity {
    return this.detections.find(x => x.detectionId === detectionId)?.severity ?? 'none';
  }

  getDetections(): readonly SplitBrainDetection[] { return this.detections; }
  getUnresolved(): SplitBrainDetection[] { return this.detections.filter(d => !d.resolved); }

  reset(): void {
    this.detections = [];
    this.alerts = [];
    this.nodeMemoryVersions.clear();
    this.nodeFingerprints.clear();
    this.replayTraces.clear();
    this.quarantinedNodes.clear();
    this.clock = 0;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private emitAlert(params: Omit<TrustAlert, 'alertId' | 'detectedAt' | 'resolved'>): TrustAlert {
    const alert: TrustAlert = {
      alertId: `ta-${this.clock++}`,
      detectedAt: this.clock,
      resolved: false,
      ...params,
    };
    this.alerts.push(alert);
    return alert;
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
}
