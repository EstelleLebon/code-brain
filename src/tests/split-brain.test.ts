import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import { SplitBrainDetector } from '../distributed-reliability/SplitBrainDetector.js';

function makeBus() { return new DistributedEventBus(); }

describe('SplitBrainDetector', () => {
  it('detect returns empty when no divergence', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 10);
    detector.updateNodeVersion('n2', 12);
    const detections = detector.detect();
    assert.equal(detections.length, 0);
  });

  it('detect finds divergence when delta > 5', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 5);
    const detections = detector.detect();
    assert.equal(detections.length, 1);
  });

  it('severity moderate for delta <= 10', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 16);
    detector.updateNodeVersion('n2', 10);
    const detections = detector.detect();
    assert.equal(detections[0].severity, 'moderate');
  });

  it('severity severe for delta <= 25', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 30);
    detector.updateNodeVersion('n2', 10);
    const detections = detector.detect();
    assert.equal(detections[0].severity, 'severe');
  });

  it('severity critical for delta > 25', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    const detections = detector.detect();
    assert.equal(detections[0].severity, 'critical');
  });

  it('resolve marks detection as resolved', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    const detections = detector.detect();
    detector.resolve(detections[0].detectionId);
    assert.ok(detector.getDetections()[0].resolved);
  });

  it('getUnresolved excludes resolved detections', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    const detections = detector.detect();
    detector.resolve(detections[0].detectionId);
    assert.equal(detector.getUnresolved().length, 0);
  });

  it('severity method returns correct level', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    const detections = detector.detect();
    assert.equal(detector.severity(detections[0].detectionId), 'critical');
  });

  it('severity returns none for unknown id', () => {
    const detector = new SplitBrainDetector(makeBus());
    assert.equal(detector.severity('unknown'), 'none');
  });

  it('divergenceType is memory_divergence', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    const detections = detector.detect();
    assert.equal(detections[0].divergenceType, 'memory_divergence');
  });

  it('bus event integration: subscribes to events', () => {
    const bus = makeBus();
    const detector = new SplitBrainDetector(bus);
    // Just verify detector was created without error when bus has events
    bus.publish({ type: 'consensus_resolved', proposalId: 'p1', outcome: true }, 'n1');
    bus.publish({ type: 'memory_replicated', sourceNodeId: 'n1', targetNodeId: 'n2', memoryId: 'm1' }, 'n1');
    assert.ok(detector.getDetections().length === 0);
  });

  it('detect accumulates to getDetections', () => {
    const detector = new SplitBrainDetector(makeBus());
    detector.updateNodeVersion('n1', 100);
    detector.updateNodeVersion('n2', 1);
    detector.detect();
    detector.detect(); // second call creates another detection
    assert.ok(detector.getDetections().length >= 1);
  });
});
