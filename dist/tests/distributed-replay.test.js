"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedReplayTimeline_js_1 = require("../distributed-replay/DistributedReplayTimeline.js");
const CrossNodeReplayEngine_js_1 = require("../distributed-replay/CrossNodeReplayEngine.js");
const ReplayConsistencyValidator_js_1 = require("../distributed-replay/ReplayConsistencyValidator.js");
function makeEvent(overrides) {
    return {
        nodeId: 'n1',
        executionId: 'exec-1',
        timestamp: 100,
        logicalClock: 1,
        eventType: 'test.event',
        payload: {},
        orderingKey: 'default',
        ...overrides,
    };
}
function makeMap(events) {
    const m = new Map();
    for (const e of events) {
        const arr = m.get(e.nodeId) ?? [];
        arr.push(e);
        m.set(e.nodeId, arr);
    }
    return m;
}
(0, node_test_1.describe)('DistributedReplayTimeline', () => {
    (0, node_test_1.it)('merge() sorts by logicalClock', () => {
        const events = [
            makeEvent({ eventId: 'e2', logicalClock: 2 }),
            makeEvent({ eventId: 'e1', logicalClock: 1 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const merged = tl.merge(makeMap(events));
        strict_1.default.equal(merged[0].eventId, 'e1');
        strict_1.default.equal(merged[1].eventId, 'e2');
    });
    (0, node_test_1.it)('merge() sorts by timestamp when logicalClock equal', () => {
        const events = [
            makeEvent({ eventId: 'e2', logicalClock: 1, timestamp: 200 }),
            makeEvent({ eventId: 'e1', logicalClock: 1, timestamp: 100 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const merged = tl.merge(makeMap(events));
        strict_1.default.equal(merged[0].eventId, 'e1');
    });
    (0, node_test_1.it)('merge() sorts by nodeId when logicalClock and timestamp equal', () => {
        const events = [
            makeEvent({ eventId: 'e2', nodeId: 'nb', logicalClock: 1, timestamp: 100 }),
            makeEvent({ eventId: 'e1', nodeId: 'na', logicalClock: 1, timestamp: 100 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const merged = tl.merge(makeMap(events));
        strict_1.default.equal(merged[0].nodeId, 'na');
    });
    (0, node_test_1.it)('merge() sorts by eventId as tiebreaker', () => {
        const events = [
            makeEvent({ eventId: 'eb', nodeId: 'n1', logicalClock: 1, timestamp: 100 }),
            makeEvent({ eventId: 'ea', nodeId: 'n1', logicalClock: 1, timestamp: 100 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const merged = tl.merge(makeMap(events));
        strict_1.default.equal(merged[0].eventId, 'ea');
    });
    (0, node_test_1.it)('merge() is deterministic (same result twice)', () => {
        const events = [
            makeEvent({ eventId: 'e3', logicalClock: 3 }),
            makeEvent({ eventId: 'e1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', logicalClock: 2 }),
        ];
        const m = makeMap(events);
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(m);
        const r1 = tl.merge(m).map(e => e.eventId).join(',');
        const r2 = tl.merge(m).map(e => e.eventId).join(',');
        strict_1.default.equal(r1, r2);
    });
    (0, node_test_1.it)('detectOrderingConflicts() finds concurrent events at same logicalClock', () => {
        const events = [
            makeEvent({ eventId: 'e1', nodeId: 'n1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', nodeId: 'n2', logicalClock: 1 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const conflicts = tl.detectOrderingConflicts();
        strict_1.default.equal(conflicts.length, 1);
    });
    (0, node_test_1.it)('detectOrderingConflicts() finds same causationId conflicts', () => {
        const events = [
            makeEvent({ eventId: 'e1', nodeId: 'n1', logicalClock: 1, causationId: 'cause-1' }),
            makeEvent({ eventId: 'e2', nodeId: 'n2', logicalClock: 1, causationId: 'cause-1' }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const conflicts = tl.detectOrderingConflicts();
        strict_1.default.equal(conflicts.length, 1);
        strict_1.default.ok(conflicts[0].reason.includes('causationId'));
    });
    (0, node_test_1.it)('criticalTransitions() returns only consensus./partition./recovery. events', () => {
        const events = [
            makeEvent({ eventId: 'e1', eventType: 'consensus.vote' }),
            makeEvent({ eventId: 'e2', eventType: 'test.event' }),
            makeEvent({ eventId: 'e3', eventType: 'partition.start' }),
            makeEvent({ eventId: 'e4', eventType: 'recovery.init' }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const critical = tl.criticalTransitions();
        strict_1.default.equal(critical.length, 3);
        strict_1.default.ok(critical.every(e => ['e1', 'e3', 'e4'].includes(e.eventId)));
    });
    (0, node_test_1.it)('rollbackChains() groups by correlationId', () => {
        const events = [
            makeEvent({ eventId: 'e1', eventType: 'node.rollback', correlationId: 'corr-1' }),
            makeEvent({ eventId: 'e2', eventType: 'node.rollback', correlationId: 'corr-1' }),
            makeEvent({ eventId: 'e3', eventType: 'node.rollback', correlationId: 'corr-2' }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const chains = tl.rollbackChains();
        strict_1.default.equal(chains.size, 2);
        strict_1.default.equal(chains.get('corr-1').length, 2);
        strict_1.default.equal(chains.get('corr-2').length, 1);
    });
    (0, node_test_1.it)('partitionWindows() matches start/end pairs', () => {
        const events = [
            makeEvent({ eventId: 'e1', eventType: 'partition.start', payload: { partitionId: 'p1', affectedNodes: ['n1', 'n2'] }, logicalClock: 1 }),
            makeEvent({ eventId: 'e2', eventType: 'partition.end', payload: { partitionId: 'p1' }, logicalClock: 2 }),
        ];
        const tl = new DistributedReplayTimeline_js_1.DistributedReplayTimeline(makeMap(events));
        const windows = tl.partitionWindows();
        strict_1.default.equal(windows.length, 1);
        strict_1.default.equal(windows[0].start.eventId, 'e1');
        strict_1.default.equal(windows[0].end.eventId, 'e2');
        strict_1.default.deepEqual(windows[0].affectedNodes, ['n1', 'n2']);
    });
});
(0, node_test_1.describe)('CrossNodeReplayEngine', () => {
    function makeEngine() {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'exec-1', nodeId: 'n1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', executionId: 'exec-1', nodeId: 'n2', logicalClock: 2 }),
            makeEvent({ eventId: 'e3', executionId: 'exec-2', nodeId: 'n1', logicalClock: 3 }),
            makeEvent({ eventId: 'e4', executionId: 'exec-1', nodeId: 'n1', logicalClock: 4, payload: { partitionId: 'p1' } }),
        ];
        return new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events), 42);
    }
    (0, node_test_1.it)('replayExecution() filters by executionId', () => {
        const engine = makeEngine();
        const result = engine.replayExecution('exec-1');
        strict_1.default.equal(result.length, 3);
        strict_1.default.ok(result.every(e => e.executionId === 'exec-1'));
    });
    (0, node_test_1.it)('replayNode() filters by nodeId', () => {
        const engine = makeEngine();
        const result = engine.replayNode('n2');
        strict_1.default.equal(result.length, 1);
        strict_1.default.equal(result[0].nodeId, 'n2');
    });
    (0, node_test_1.it)('replayPartition() filters by partitionId', () => {
        const engine = makeEngine();
        const result = engine.replayPartition('p1');
        strict_1.default.equal(result.length, 1);
        strict_1.default.equal(result[0].eventId, 'e4');
    });
    (0, node_test_1.it)('dryReplay() returns correct counts', () => {
        const engine = makeEngine();
        const result = engine.dryReplay();
        strict_1.default.equal(result.eventCount, 4);
        strict_1.default.equal(result.nodeCount, 2);
        strict_1.default.ok(typeof result.timelineHash === 'string');
    });
    (0, node_test_1.it)('replayFromSnapshot() returns events after snapshotId', () => {
        const engine = makeEngine();
        const result = engine.replayFromSnapshot('e2');
        strict_1.default.ok(result.every(e => e.eventId >= 'e2'));
    });
    (0, node_test_1.it)('replayUntil() returns events before eventId', () => {
        const engine = makeEngine();
        const result = engine.replayUntil('e3');
        strict_1.default.ok(result.every(e => e.eventId !== 'e3'));
        strict_1.default.ok(result.length < 4);
    });
    (0, node_test_1.it)('compareReplay() returns match=true for identical executions', () => {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'exec-a', eventType: 'op.run', orderingKey: 'k1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', executionId: 'exec-a', eventType: 'op.done', orderingKey: 'k2', logicalClock: 2 }),
        ];
        const engine = new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events), 1);
        const result = engine.compareReplay('exec-a', 'exec-a');
        strict_1.default.equal(result.match, true);
    });
    (0, node_test_1.it)('compareReplay() returns divergencePoint for different executions', () => {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'exec-a', eventType: 'op.run', orderingKey: 'k1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', executionId: 'exec-b', eventType: 'op.other', orderingKey: 'k2', logicalClock: 2 }),
        ];
        const engine = new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events), 1);
        const result = engine.compareReplay('exec-a', 'exec-b');
        // different event counts → divergence
        strict_1.default.equal(result.match, false);
    });
});
(0, node_test_1.describe)('ReplayConsistencyValidator', () => {
    function makeValidator() {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'exec-1', eventType: 'op.run', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', executionId: 'exec-1', eventType: 'op.done', logicalClock: 2 }),
        ];
        const engine = new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events), 42);
        return new ReplayConsistencyValidator_js_1.ReplayConsistencyValidator(engine);
    }
    (0, node_test_1.it)('validate() returns deterministic=true for stable replay', () => {
        const validator = makeValidator();
        const result = validator.validate('exec-1');
        strict_1.default.equal(result.deterministic, true);
        strict_1.default.equal(result.divergencePoints.length, 0);
    });
    (0, node_test_1.it)('validateOrdering() returns true for sorted events', () => {
        const validator = makeValidator();
        const events = [
            makeEvent({ eventId: 'e1', logicalClock: 1, timestamp: 100 }),
            makeEvent({ eventId: 'e2', logicalClock: 2, timestamp: 200 }),
        ];
        strict_1.default.equal(validator.validateOrdering(events), true);
    });
    (0, node_test_1.it)('validateOrdering() returns false for unsorted events', () => {
        const validator = makeValidator();
        const events = [
            makeEvent({ eventId: 'e2', logicalClock: 2 }),
            makeEvent({ eventId: 'e1', logicalClock: 1 }),
        ];
        strict_1.default.equal(validator.validateOrdering(events), false);
    });
    (0, node_test_1.it)('validateMemoryConvergence() passes for valid replicate events', () => {
        const validator = makeValidator();
        const events = [
            makeEvent({ eventId: 'e1', nodeId: 'n1', eventType: 'memory.replicate' }),
            makeEvent({ eventId: 'e2', nodeId: 'n2', eventType: 'memory.replicate' }),
        ];
        strict_1.default.equal(validator.validateMemoryConvergence(events), true);
    });
    (0, node_test_1.it)('validateConsensusOrder() passes when votes before commits', () => {
        const validator = makeValidator();
        const events = [
            makeEvent({ eventId: 'e1', eventType: 'consensus.vote', correlationId: 'round-1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', eventType: 'consensus.commit', correlationId: 'round-1', logicalClock: 2 }),
        ];
        strict_1.default.equal(validator.validateConsensusOrder(events), true);
    });
});
//# sourceMappingURL=distributed-replay.test.js.map