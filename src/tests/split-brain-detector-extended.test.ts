import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SplitBrainDetector } from '../distributed-reliability/SplitBrainDetector.js';
import { ClusterTrustManager } from '../distributed-cognition/ClusterTrustManager.js';

function makeBus() {
  const handlers: Record<string, (() => void)[]> = {};
  return {
    subscribe(event: string, fn: () => void) { (handlers[event] ??= []).push(fn); },
    publish(event: string) { (handlers[event] ?? []).forEach(fn => fn()); },
    emit(event: string) { (handlers[event] ?? []).forEach(fn => fn()); },
    on(event: string, fn: () => void) { (handlers[event] ??= []).push(fn); },
  };
}

describe('SplitBrainDetector — TrustAlert and extended detection', () => {
  it('detectFingerprintDivergence returns empty when all fingerprints match', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-abc');
    detector.updateNodeFingerprint('n2', 'fp-abc');
    detector.updateNodeFingerprint('n3', 'fp-abc');
    const alerts = detector.detectFingerprintDivergence();
    assert.equal(alerts.length, 0);
  });

  it('detectFingerprintDivergence emits TrustAlert for diverging fingerprint', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-A');
    detector.updateNodeFingerprint('n3', 'fp-B');
    const alerts = detector.detectFingerprintDivergence();
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, 'fingerprint_divergence');
    assert.ok(['mild', 'moderate', 'severe'].includes(alerts[0].severity));
    assert.ok(['degrade', 'quarantine'].includes(alerts[0].recommendation));
    assert.ok(alerts[0].implicatedNodes.includes('n3'));
  });

  it('detectFingerprintDivergence recommends quarantine when minority >= 50%', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-B');
    const alerts = detector.detectFingerprintDivergence();
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'severe');
    assert.equal(alerts[0].recommendation, 'quarantine');
  });

  it('detectMajorityInconsistency returns empty when quorum exists', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-A');
    detector.updateNodeFingerprint('n3', 'fp-B');
    const alerts = detector.detectMajorityInconsistency(3);
    assert.equal(alerts.length, 0);
  });

  it('detectMajorityInconsistency emits critical alert when no quorum', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-B');
    detector.updateNodeFingerprint('n3', 'fp-C');
    // totalNodes=5 → quorum=3, no group has 3
    const alerts = detector.detectMajorityInconsistency(5);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, 'majority_inconsistency');
    assert.equal(alerts[0].severity, 'critical');
    assert.equal(alerts[0].recommendation, 'quarantine');
  });

  it('detectReplayIncompatibility returns empty when all traces match', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateReplayTrace('n1', ['e1', 'e2', 'e3']);
    detector.updateReplayTrace('n2', ['e1', 'e2', 'e3']);
    const alerts = detector.detectReplayIncompatibility();
    assert.equal(alerts.length, 0);
  });

  it('detectReplayIncompatibility emits alert when traces diverge', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateReplayTrace('n1', ['e1', 'e2', 'e3']);
    detector.updateReplayTrace('n2', ['e1', 'e3', 'e2']); // different order
    const alerts = detector.detectReplayIncompatibility();
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, 'replay_incompatibility');
    assert.equal(alerts[0].recommendation, 'reconcile');
  });

  it('quarantineNode marks node as quarantined', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    assert.equal(detector.isQuarantined('n1'), false);
    detector.quarantineNode('n1');
    assert.equal(detector.isQuarantined('n1'), true);
    assert.deepEqual(detector.getQuarantinedNodes(), ['n1']);
  });

  it('releaseNode removes quarantine', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.quarantineNode('n1');
    detector.releaseNode('n1');
    assert.equal(detector.isQuarantined('n1'), false);
  });

  it('resolveAlert marks alert as resolved', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-B');
    const alerts = detector.detectFingerprintDivergence();
    assert.equal(alerts.length, 1);
    const alertId = alerts[0].alertId;
    assert.equal(detector.getUnresolvedAlerts().length, 1);
    detector.resolveAlert(alertId);
    assert.equal(detector.getUnresolvedAlerts().length, 0);
  });

  it('reset clears all state', () => {
    const detector = new SplitBrainDetector(makeBus() as never);
    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-B');
    detector.detectFingerprintDivergence();
    detector.quarantineNode('n1');
    detector.reset();
    assert.equal(detector.getAlerts().length, 0);
    assert.equal(detector.getDetections().length, 0);
    assert.equal(detector.getQuarantinedNodes().length, 0);
  });
});

describe('ClusterTrustManager — SplitBrainDetector integration', () => {
  it('processTrustAlerts degrades implicated nodes', () => {
    const bus = makeBus();
    const detector = new SplitBrainDetector(bus as never);
    const trust = new ClusterTrustManager(detector);
    trust.initNode('n1');
    trust.initNode('n2');

    detector.updateNodeFingerprint('n1', 'fp-A');
    detector.updateNodeFingerprint('n2', 'fp-B');
    const alerts = detector.detectFingerprintDivergence();

    trust.processTrustAlerts(alerts);

    // Implicated nodes should have reduced or quarantined trust
    const n1 = trust.getNodeTrust('n1');
    const n2 = trust.getNodeTrust('n2');
    assert.ok(n1 !== undefined);
    assert.ok(n2 !== undefined);
    // At least one node must have been affected
    const anyDegraded = (n1.trustScore < 1.0 || n1.quarantined) || (n2.trustScore < 1.0 || n2.quarantined);
    assert.ok(anyDegraded, 'expected at least one node to be degraded or quarantined');
  });

  it('quarantineNode sets trust to 0 and marks quarantined flag', () => {
    const trust = new ClusterTrustManager();
    trust.initNode('n1');
    trust.quarantineNode('n1');
    const t = trust.getNodeTrust('n1')!;
    assert.equal(t.trustScore, 0);
    assert.equal(t.quarantined, true);
  });

  it('releaseNode restores trust to at least recoveryTrust', () => {
    const trust = new ClusterTrustManager();
    trust.initNode('n1');
    trust.quarantineNode('n1');
    trust.releaseNode('n1', 0.4);
    const t = trust.getNodeTrust('n1')!;
    assert.equal(t.quarantined, false);
    assert.ok(t.trustScore >= 0.4);
  });

  it('progressive degradation auto-quarantines after 10 incidents', () => {
    const trust = new ClusterTrustManager();
    trust.initNode('n1');
    // 10 failure incidents
    for (let i = 0; i < 10; i++) trust.degradeUnstableNode('n1');
    const t = trust.getNodeTrust('n1')!;
    assert.ok(t.quarantined, 'node should be auto-quarantined after 10 incidents');
  });

  it('getQuarantinedNodes returns only quarantined nodes', () => {
    const trust = new ClusterTrustManager();
    trust.initNode('n1');
    trust.initNode('n2');
    trust.initNode('n3');
    trust.quarantineNode('n2');
    const quarantined = trust.getQuarantinedNodes();
    assert.deepEqual(quarantined, ['n2']);
  });
});
