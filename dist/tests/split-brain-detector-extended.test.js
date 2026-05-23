"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SplitBrainDetector_js_1 = require("../distributed-reliability/SplitBrainDetector.js");
const ClusterTrustManager_js_1 = require("../distributed-cognition/ClusterTrustManager.js");
function makeBus() {
    const handlers = {};
    return {
        subscribe(event, fn) { (handlers[event] ??= []).push(fn); },
        publish(event) { (handlers[event] ?? []).forEach(fn => fn()); },
        emit(event) { (handlers[event] ?? []).forEach(fn => fn()); },
        on(event, fn) { (handlers[event] ??= []).push(fn); },
    };
}
(0, node_test_1.describe)('SplitBrainDetector — TrustAlert and extended detection', () => {
    (0, node_test_1.it)('detectFingerprintDivergence returns empty when all fingerprints match', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-abc');
        detector.updateNodeFingerprint('n2', 'fp-abc');
        detector.updateNodeFingerprint('n3', 'fp-abc');
        const alerts = detector.detectFingerprintDivergence();
        strict_1.default.equal(alerts.length, 0);
    });
    (0, node_test_1.it)('detectFingerprintDivergence emits TrustAlert for diverging fingerprint', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-A');
        detector.updateNodeFingerprint('n3', 'fp-B');
        const alerts = detector.detectFingerprintDivergence();
        strict_1.default.equal(alerts.length, 1);
        strict_1.default.equal(alerts[0].kind, 'fingerprint_divergence');
        strict_1.default.ok(['mild', 'moderate', 'severe'].includes(alerts[0].severity));
        strict_1.default.ok(['degrade', 'quarantine'].includes(alerts[0].recommendation));
        strict_1.default.ok(alerts[0].implicatedNodes.includes('n3'));
    });
    (0, node_test_1.it)('detectFingerprintDivergence recommends quarantine when minority >= 50%', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-B');
        const alerts = detector.detectFingerprintDivergence();
        strict_1.default.equal(alerts.length, 1);
        strict_1.default.equal(alerts[0].severity, 'severe');
        strict_1.default.equal(alerts[0].recommendation, 'quarantine');
    });
    (0, node_test_1.it)('detectMajorityInconsistency returns empty when quorum exists', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-A');
        detector.updateNodeFingerprint('n3', 'fp-B');
        const alerts = detector.detectMajorityInconsistency(3);
        strict_1.default.equal(alerts.length, 0);
    });
    (0, node_test_1.it)('detectMajorityInconsistency emits critical alert when no quorum', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-B');
        detector.updateNodeFingerprint('n3', 'fp-C');
        // totalNodes=5 → quorum=3, no group has 3
        const alerts = detector.detectMajorityInconsistency(5);
        strict_1.default.equal(alerts.length, 1);
        strict_1.default.equal(alerts[0].kind, 'majority_inconsistency');
        strict_1.default.equal(alerts[0].severity, 'critical');
        strict_1.default.equal(alerts[0].recommendation, 'quarantine');
    });
    (0, node_test_1.it)('detectReplayIncompatibility returns empty when all traces match', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateReplayTrace('n1', ['e1', 'e2', 'e3']);
        detector.updateReplayTrace('n2', ['e1', 'e2', 'e3']);
        const alerts = detector.detectReplayIncompatibility();
        strict_1.default.equal(alerts.length, 0);
    });
    (0, node_test_1.it)('detectReplayIncompatibility emits alert when traces diverge', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateReplayTrace('n1', ['e1', 'e2', 'e3']);
        detector.updateReplayTrace('n2', ['e1', 'e3', 'e2']); // different order
        const alerts = detector.detectReplayIncompatibility();
        strict_1.default.equal(alerts.length, 1);
        strict_1.default.equal(alerts[0].kind, 'replay_incompatibility');
        strict_1.default.equal(alerts[0].recommendation, 'reconcile');
    });
    (0, node_test_1.it)('quarantineNode marks node as quarantined', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        strict_1.default.equal(detector.isQuarantined('n1'), false);
        detector.quarantineNode('n1');
        strict_1.default.equal(detector.isQuarantined('n1'), true);
        strict_1.default.deepEqual(detector.getQuarantinedNodes(), ['n1']);
    });
    (0, node_test_1.it)('releaseNode removes quarantine', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.quarantineNode('n1');
        detector.releaseNode('n1');
        strict_1.default.equal(detector.isQuarantined('n1'), false);
    });
    (0, node_test_1.it)('resolveAlert marks alert as resolved', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-B');
        const alerts = detector.detectFingerprintDivergence();
        strict_1.default.equal(alerts.length, 1);
        const alertId = alerts[0].alertId;
        strict_1.default.equal(detector.getUnresolvedAlerts().length, 1);
        detector.resolveAlert(alertId);
        strict_1.default.equal(detector.getUnresolvedAlerts().length, 0);
    });
    (0, node_test_1.it)('reset clears all state', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-B');
        detector.detectFingerprintDivergence();
        detector.quarantineNode('n1');
        detector.reset();
        strict_1.default.equal(detector.getAlerts().length, 0);
        strict_1.default.equal(detector.getDetections().length, 0);
        strict_1.default.equal(detector.getQuarantinedNodes().length, 0);
    });
});
(0, node_test_1.describe)('ClusterTrustManager — SplitBrainDetector integration', () => {
    (0, node_test_1.it)('processTrustAlerts degrades implicated nodes', () => {
        const bus = makeBus();
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(bus);
        const trust = new ClusterTrustManager_js_1.ClusterTrustManager(detector);
        trust.initNode('n1');
        trust.initNode('n2');
        detector.updateNodeFingerprint('n1', 'fp-A');
        detector.updateNodeFingerprint('n2', 'fp-B');
        const alerts = detector.detectFingerprintDivergence();
        trust.processTrustAlerts(alerts);
        // Implicated nodes should have reduced or quarantined trust
        const n1 = trust.getNodeTrust('n1');
        const n2 = trust.getNodeTrust('n2');
        strict_1.default.ok(n1 !== undefined);
        strict_1.default.ok(n2 !== undefined);
        // At least one node must have been affected
        const anyDegraded = (n1.trustScore < 1.0 || n1.quarantined) || (n2.trustScore < 1.0 || n2.quarantined);
        strict_1.default.ok(anyDegraded, 'expected at least one node to be degraded or quarantined');
    });
    (0, node_test_1.it)('quarantineNode sets trust to 0 and marks quarantined flag', () => {
        const trust = new ClusterTrustManager_js_1.ClusterTrustManager();
        trust.initNode('n1');
        trust.quarantineNode('n1');
        const t = trust.getNodeTrust('n1');
        strict_1.default.equal(t.trustScore, 0);
        strict_1.default.equal(t.quarantined, true);
    });
    (0, node_test_1.it)('releaseNode restores trust to at least recoveryTrust', () => {
        const trust = new ClusterTrustManager_js_1.ClusterTrustManager();
        trust.initNode('n1');
        trust.quarantineNode('n1');
        trust.releaseNode('n1', 0.4);
        const t = trust.getNodeTrust('n1');
        strict_1.default.equal(t.quarantined, false);
        strict_1.default.ok(t.trustScore >= 0.4);
    });
    (0, node_test_1.it)('progressive degradation auto-quarantines after 10 incidents', () => {
        const trust = new ClusterTrustManager_js_1.ClusterTrustManager();
        trust.initNode('n1');
        // 10 failure incidents
        for (let i = 0; i < 10; i++)
            trust.degradeUnstableNode('n1');
        const t = trust.getNodeTrust('n1');
        strict_1.default.ok(t.quarantined, 'node should be auto-quarantined after 10 incidents');
    });
    (0, node_test_1.it)('getQuarantinedNodes returns only quarantined nodes', () => {
        const trust = new ClusterTrustManager_js_1.ClusterTrustManager();
        trust.initNode('n1');
        trust.initNode('n2');
        trust.initNode('n3');
        trust.quarantineNode('n2');
        const quarantined = trust.getQuarantinedNodes();
        strict_1.default.deepEqual(quarantined, ['n2']);
    });
});
//# sourceMappingURL=split-brain-detector-extended.test.js.map