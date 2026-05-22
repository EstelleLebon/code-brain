"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("../event-store/index.js");
function makeExecutionId() {
    return `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function goalCreated(executionId, overrides = {}) {
    return (0, index_js_1.createEvent)({
        executionId,
        eventType: 'goal:created',
        payload: { goalId: 'g1', goalType: 'repair', priority: 'high', description: 'fix bug' },
        ...overrides,
    });
}
function stepExecuted(executionId, outcome = 'success', causationId) {
    return (0, index_js_1.createEvent)({
        executionId,
        eventType: 'step:executed',
        payload: { stepId: (0, index_js_1.makeEventId)(), planId: 'p1', outcome, durationMs: 50, error: outcome === 'failure' ? 'boom' : undefined },
        causationId,
    });
}
// ─── EventStore ───────────────────────────────────────────────────────────────
(0, node_test_1.describe)('EventStore', () => {
    (0, node_test_1.it)('appends and retrieves events in order', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        const e1 = goalCreated(execId);
        const e2 = stepExecuted(execId);
        store.append(e1);
        store.append(e2);
        const result = store.stream(execId);
        strict_1.default.equal(result.length, 2);
        strict_1.default.equal(result[0].id, e1.id);
        strict_1.default.equal(result[1].id, e2.id);
    });
    (0, node_test_1.it)('appendBatch appends multiple events', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        store.appendBatch([goalCreated(execId), stepExecuted(execId), stepExecuted(execId)]);
        strict_1.default.equal(store.size, 3);
    });
    (0, node_test_1.it)('query filters by executionId', () => {
        const store = new index_js_1.EventStore();
        const exec1 = makeExecutionId();
        const exec2 = makeExecutionId();
        store.append(goalCreated(exec1));
        store.append(goalCreated(exec2));
        strict_1.default.equal(store.query({ executionId: exec1 }).length, 1);
    });
    (0, node_test_1.it)('query filters by eventType', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        store.append(goalCreated(execId));
        store.append(stepExecuted(execId));
        const plans = store.query({ eventTypes: ['plan:generated'] });
        strict_1.default.equal(plans.length, 0);
        const goals = store.query({ eventTypes: ['goal:created'] });
        strict_1.default.equal(goals.length, 1);
    });
    (0, node_test_1.it)('query filters by since/until', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        const past = new Date(Date.now() - 10000);
        const future = new Date(Date.now() + 10000);
        store.append(goalCreated(execId));
        strict_1.default.equal(store.query({ since: future }).length, 0);
        strict_1.default.equal(store.query({ until: past }).length, 0);
        strict_1.default.equal(store.query({ since: past, until: future }).length, 1);
    });
    (0, node_test_1.it)('since returns events after timestamp', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        store.append(goalCreated(execId));
        const after = new Date(Date.now() + 1000);
        strict_1.default.equal(store.since(after).length, 0);
        const before = new Date(Date.now() - 1000);
        strict_1.default.equal(store.since(before).length, 1);
    });
    (0, node_test_1.it)('events are immutable after append', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        const e = goalCreated(execId);
        store.append(e);
        const retrieved = store.stream(execId)[0];
        strict_1.default.throws(() => {
            retrieved['id'] = 'hacked';
        });
    });
    (0, node_test_1.it)('snapshot captures current state', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        store.append(goalCreated(execId));
        store.append(stepExecuted(execId));
        const snap = store.snapshot();
        strict_1.default.equal(snap.eventCount, 2);
        strict_1.default.equal(snap.events.length, 2);
        strict_1.default.ok(snap.id.startsWith('evt-'));
    });
    (0, node_test_1.it)('clear removes all events', () => {
        const store = new index_js_1.EventStore();
        const execId = makeExecutionId();
        store.append(goalCreated(execId));
        store.clear();
        strict_1.default.equal(store.size, 0);
    });
});
// ─── TimelineBuilder ──────────────────────────────────────────────────────────
(0, node_test_1.describe)('TimelineBuilder', () => {
    (0, node_test_1.it)('builds empty timeline for no events', () => {
        const tb = new index_js_1.TimelineBuilder();
        const tl = tb.build([]);
        strict_1.default.equal(tl.totalEvents, 0);
        strict_1.default.equal(tl.roots.length, 0);
    });
    (0, node_test_1.it)('builds causal parent/child relationships', () => {
        const tb = new index_js_1.TimelineBuilder();
        const execId = makeExecutionId();
        const parent = goalCreated(execId);
        const child = stepExecuted(execId, 'success', parent.id);
        const tl = tb.build([parent, child]);
        strict_1.default.equal(tl.roots.length, 1);
        strict_1.default.equal(tl.roots[0].children.length, 1);
        strict_1.default.equal(tl.roots[0].children[0].event.id, child.id);
    });
    (0, node_test_1.it)('criticalMoments identifies failures and recoveries', () => {
        const tb = new index_js_1.TimelineBuilder();
        const execId = makeExecutionId();
        const fail = stepExecuted(execId, 'failure');
        const recovery = (0, index_js_1.createEvent)({
            executionId: execId,
            eventType: 'recovery:triggered',
            payload: { strategyId: 's1', reason: 'retry after timeout' },
        });
        const moments = tb.criticalMoments([fail, recovery]);
        strict_1.default.equal(moments.length, 2);
    });
    (0, node_test_1.it)('failures returns only failed steps', () => {
        const tb = new index_js_1.TimelineBuilder();
        const execId = makeExecutionId();
        const events = [stepExecuted(execId, 'success'), stepExecuted(execId, 'failure'), stepExecuted(execId, 'success')];
        strict_1.default.equal(tb.failures(events).length, 1);
    });
    (0, node_test_1.it)('modeTransitions extracts mode switches', () => {
        const tb = new index_js_1.TimelineBuilder();
        const execId = makeExecutionId();
        const modeSwitch = (0, index_js_1.createEvent)({
            executionId: execId,
            eventType: 'mode:switched',
            payload: { fromMode: 'conservative', toMode: 'aggressive', reason: 'low risk' },
        });
        const transitions = tb.modeTransitions([modeSwitch]);
        strict_1.default.equal(transitions.length, 1);
        strict_1.default.equal(transitions[0].from, 'conservative');
        strict_1.default.equal(transitions[0].to, 'aggressive');
    });
    (0, node_test_1.it)('rollbackDepth finds maximum depth', () => {
        const tb = new index_js_1.TimelineBuilder();
        const execId = makeExecutionId();
        const rb1 = (0, index_js_1.createEvent)({
            executionId: execId,
            eventType: 'rollback:applied',
            payload: { planId: 'p1', rolledBackSteps: ['s1'], depth: 2 },
        });
        const rb2 = (0, index_js_1.createEvent)({
            executionId: execId,
            eventType: 'rollback:applied',
            payload: { planId: 'p1', rolledBackSteps: ['s1', 's2', 's3'], depth: 5 },
        });
        strict_1.default.equal(tb.rollbackDepth([rb1, rb2]), 5);
    });
});
// ─── SnapshotManager ──────────────────────────────────────────────────────────
(0, node_test_1.describe)('SnapshotManager', () => {
    function makeSource() {
        return {
            getWorkingMemoryState: () => ({ items: [] }),
            getEpisodicMemoryState: () => ({ episodes: [] }),
            getSemanticMemoryState: () => ({ concepts: [] }),
            getProceduralMemoryState: () => ({ procedures: [] }),
            getTrustState: () => ({
                successCount: 3,
                failureCount: 1,
                chunkReliability: {},
            }),
        };
    }
    (0, node_test_1.it)('creates a snapshot with correct structure', () => {
        const sm = new index_js_1.SnapshotManager();
        const execId = makeExecutionId();
        const snap = sm.createSnapshot(execId, makeSource());
        strict_1.default.equal(snap.executionId, execId);
        strict_1.default.ok(snap.id.startsWith('snap-'));
        strict_1.default.deepEqual(snap.trust.successCount, 3);
    });
    (0, node_test_1.it)('restores snapshot by id', () => {
        const sm = new index_js_1.SnapshotManager();
        const execId = makeExecutionId();
        const snap = sm.createSnapshot(execId, makeSource());
        const restored = sm.restoreSnapshot(snap.id);
        strict_1.default.ok(restored);
        strict_1.default.equal(restored.id, snap.id);
    });
    (0, node_test_1.it)('latest returns most recent snapshot', () => {
        const sm = new index_js_1.SnapshotManager();
        const execId = makeExecutionId();
        sm.createSnapshot(execId, makeSource());
        const snap2 = sm.createSnapshot(execId, makeSource());
        strict_1.default.equal(sm.latest().id, snap2.id);
    });
    (0, node_test_1.it)('list returns all snapshots newest-first', () => {
        const sm = new index_js_1.SnapshotManager();
        const execId = makeExecutionId();
        sm.createSnapshot(execId, makeSource());
        sm.createSnapshot(execId, makeSource());
        const list = sm.list();
        strict_1.default.equal(list.length, 2);
        strict_1.default.ok(list[0].createdAt >= list[1].createdAt);
    });
    (0, node_test_1.it)('latestForExecution scopes to execution', () => {
        const sm = new index_js_1.SnapshotManager();
        const e1 = makeExecutionId();
        const e2 = makeExecutionId();
        sm.createSnapshot(e1, makeSource());
        const snap2 = sm.createSnapshot(e2, makeSource());
        strict_1.default.equal(sm.latestForExecution(e2).id, snap2.id);
        strict_1.default.ok(sm.latestForExecution(e1) !== undefined);
        strict_1.default.ok(sm.latestForExecution('nonexistent') === undefined);
    });
});
// ─── ReplayEngine ─────────────────────────────────────────────────────────────
(0, node_test_1.describe)('ReplayEngine', () => {
    (0, node_test_1.it)('replays all events for executionId', async () => {
        const store = new index_js_1.EventStore();
        const sm = new index_js_1.SnapshotManager();
        const engine = new index_js_1.ReplayEngine(store, sm);
        const execId = makeExecutionId();
        store.appendBatch([goalCreated(execId), stepExecuted(execId), stepExecuted(execId)]);
        const replayed = [];
        engine.onEvent(e => { replayed.push(e); });
        const result = await engine.replay(execId);
        strict_1.default.equal(result.eventsReplayed, 3);
        strict_1.default.equal(replayed.length, 3);
        strict_1.default.equal(result.fromSnapshot, false);
    });
    (0, node_test_1.it)('replayFrom uses snapshot as starting point', async () => {
        const store = new index_js_1.EventStore();
        const sm = new index_js_1.SnapshotManager();
        const engine = new index_js_1.ReplayEngine(store, sm);
        const execId = makeExecutionId();
        const e1 = goalCreated(execId);
        store.append(e1);
        // create snapshot after first event
        const snapSource = {
            getWorkingMemoryState: () => ({}),
            getEpisodicMemoryState: () => ({}),
            getSemanticMemoryState: () => ({}),
            getProceduralMemoryState: () => ({}),
            getTrustState: () => ({ successCount: 0, failureCount: 0, chunkReliability: {} }),
        };
        const snap = sm.createSnapshot(execId, snapSource);
        // events after snapshot
        const e2 = stepExecuted(execId);
        const e3 = stepExecuted(execId);
        store.appendBatch([e2, e3]);
        const replayed = [];
        engine.onEvent(e => { replayed.push(e); });
        const result = await engine.replayFrom(snap.id);
        // only events after snapshot timestamp
        strict_1.default.equal(result.fromSnapshot, true);
        strict_1.default.equal(result.snapshotId, snap.id);
    });
    (0, node_test_1.it)('replayFrom throws for unknown snapshot', async () => {
        const store = new index_js_1.EventStore();
        const sm = new index_js_1.SnapshotManager();
        const engine = new index_js_1.ReplayEngine(store, sm);
        await strict_1.default.rejects(() => engine.replayFrom('nonexistent'), /Snapshot not found/);
    });
    (0, node_test_1.it)('dryReplay counts event types and causal chains', async () => {
        const store = new index_js_1.EventStore();
        const sm = new index_js_1.SnapshotManager();
        const engine = new index_js_1.ReplayEngine(store, sm);
        const execId = makeExecutionId();
        const e1 = goalCreated(execId);
        const e2 = stepExecuted(execId, 'success', e1.id);
        const e3 = stepExecuted(execId, 'failure', e1.id);
        const result = await engine.dryReplay([e1, e2, e3]);
        strict_1.default.equal(result.eventsProcessed, 3);
        strict_1.default.equal(result.eventTypes['goal:created'], 1);
        strict_1.default.equal(result.eventTypes['step:executed'], 2);
        strict_1.default.equal(result.causalChains, 2);
        strict_1.default.equal(result.orphanedEvents, 0);
    });
    (0, node_test_1.it)('dryReplay detects orphaned causations', async () => {
        const store = new index_js_1.EventStore();
        const sm = new index_js_1.SnapshotManager();
        const engine = new index_js_1.ReplayEngine(store, sm);
        const execId = makeExecutionId();
        const e1 = stepExecuted(execId, 'success', 'ghost-id');
        const result = await engine.dryReplay([e1]);
        strict_1.default.equal(result.orphanedEvents, 1);
    });
});
//# sourceMappingURL=event-store.test.js.map