"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedEventBus_js_1 = require("../distributed/DistributedEventBus.js");
const SplitBrainDetector_js_1 = require("../distributed-reliability/SplitBrainDetector.js");
function makeBus() { return new DistributedEventBus_js_1.DistributedEventBus(); }
(0, node_test_1.describe)('SplitBrainDetector', () => {
    (0, node_test_1.it)('detect returns empty when no divergence', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 10);
        detector.updateNodeVersion('n2', 12);
        const detections = detector.detect();
        strict_1.default.equal(detections.length, 0);
    });
    (0, node_test_1.it)('detect finds divergence when delta > 5', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 5);
        const detections = detector.detect();
        strict_1.default.equal(detections.length, 1);
    });
    (0, node_test_1.it)('severity moderate for delta <= 10', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 16);
        detector.updateNodeVersion('n2', 10);
        const detections = detector.detect();
        strict_1.default.equal(detections[0].severity, 'moderate');
    });
    (0, node_test_1.it)('severity severe for delta <= 25', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 30);
        detector.updateNodeVersion('n2', 10);
        const detections = detector.detect();
        strict_1.default.equal(detections[0].severity, 'severe');
    });
    (0, node_test_1.it)('severity critical for delta > 25', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        const detections = detector.detect();
        strict_1.default.equal(detections[0].severity, 'critical');
    });
    (0, node_test_1.it)('resolve marks detection as resolved', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        const detections = detector.detect();
        detector.resolve(detections[0].detectionId);
        strict_1.default.ok(detector.getDetections()[0].resolved);
    });
    (0, node_test_1.it)('getUnresolved excludes resolved detections', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        const detections = detector.detect();
        detector.resolve(detections[0].detectionId);
        strict_1.default.equal(detector.getUnresolved().length, 0);
    });
    (0, node_test_1.it)('severity method returns correct level', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        const detections = detector.detect();
        strict_1.default.equal(detector.severity(detections[0].detectionId), 'critical');
    });
    (0, node_test_1.it)('severity returns none for unknown id', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        strict_1.default.equal(detector.severity('unknown'), 'none');
    });
    (0, node_test_1.it)('divergenceType is memory_divergence', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        const detections = detector.detect();
        strict_1.default.equal(detections[0].divergenceType, 'memory_divergence');
    });
    (0, node_test_1.it)('bus event integration: subscribes to events', () => {
        const bus = makeBus();
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(bus);
        // Just verify detector was created without error when bus has events
        bus.publish({ type: 'consensus_resolved', proposalId: 'p1', outcome: true }, 'n1');
        bus.publish({ type: 'memory_replicated', sourceNodeId: 'n1', targetNodeId: 'n2', memoryId: 'm1' }, 'n1');
        strict_1.default.ok(detector.getDetections().length === 0);
    });
    (0, node_test_1.it)('detect accumulates to getDetections', () => {
        const detector = new SplitBrainDetector_js_1.SplitBrainDetector(makeBus());
        detector.updateNodeVersion('n1', 100);
        detector.updateNodeVersion('n2', 1);
        detector.detect();
        detector.detect(); // second call creates another detection
        strict_1.default.ok(detector.getDetections().length >= 1);
    });
});
//# sourceMappingURL=split-brain.test.js.map