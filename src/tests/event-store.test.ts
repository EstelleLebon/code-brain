import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EventStore,
  CognitiveEvent,
  createEvent,
  makeEventId,
  TimelineBuilder,
  SnapshotManager,
  ReplayEngine,
  type SnapshotSource,
  type TrustSnapshot,
} from '../event-store/index.js';

function makeExecutionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function goalCreated(executionId: string, overrides: Partial<CognitiveEvent> = {}): CognitiveEvent {
  return createEvent<CognitiveEvent>({
    executionId,
    eventType: 'goal:created',
    payload: { goalId: 'g1', goalType: 'repair', priority: 'high', description: 'fix bug' },
    ...overrides,
  } as Parameters<typeof createEvent>[0]);
}

function stepExecuted(
  executionId: string,
  outcome: 'success' | 'failure' | 'skipped' = 'success',
  causationId?: string
): CognitiveEvent {
  return createEvent<CognitiveEvent>({
    executionId,
    eventType: 'step:executed',
    payload: { stepId: makeEventId(), planId: 'p1', outcome, durationMs: 50, error: outcome === 'failure' ? 'boom' : undefined },
    causationId,
  } as Parameters<typeof createEvent>[0]);
}

// ─── EventStore ───────────────────────────────────────────────────────────────

describe('EventStore', () => {
  it('appends and retrieves events in order', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    const e1 = goalCreated(execId);
    const e2 = stepExecuted(execId);
    store.append(e1);
    store.append(e2);
    const result = store.stream(execId);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, e1.id);
    assert.equal(result[1].id, e2.id);
  });

  it('appendBatch appends multiple events', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    store.appendBatch([goalCreated(execId), stepExecuted(execId), stepExecuted(execId)]);
    assert.equal(store.size, 3);
  });

  it('query filters by executionId', () => {
    const store = new EventStore();
    const exec1 = makeExecutionId();
    const exec2 = makeExecutionId();
    store.append(goalCreated(exec1));
    store.append(goalCreated(exec2));
    assert.equal(store.query({ executionId: exec1 }).length, 1);
  });

  it('query filters by eventType', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    store.append(goalCreated(execId));
    store.append(stepExecuted(execId));
    const plans = store.query({ eventTypes: ['plan:generated'] });
    assert.equal(plans.length, 0);
    const goals = store.query({ eventTypes: ['goal:created'] });
    assert.equal(goals.length, 1);
  });

  it('query filters by since/until', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    const past = new Date(Date.now() - 10000);
    const future = new Date(Date.now() + 10000);
    store.append(goalCreated(execId));
    assert.equal(store.query({ since: future }).length, 0);
    assert.equal(store.query({ until: past }).length, 0);
    assert.equal(store.query({ since: past, until: future }).length, 1);
  });

  it('since returns events after timestamp', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    store.append(goalCreated(execId));
    const after = new Date(Date.now() + 1000);
    assert.equal(store.since(after).length, 0);
    const before = new Date(Date.now() - 1000);
    assert.equal(store.since(before).length, 1);
  });

  it('events are immutable after append', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    const e = goalCreated(execId);
    store.append(e);
    const retrieved = store.stream(execId)[0];
    assert.throws(() => {
      (retrieved as unknown as Record<string, unknown>)['id'] = 'hacked';
    });
  });

  it('snapshot captures current state', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    store.append(goalCreated(execId));
    store.append(stepExecuted(execId));
    const snap = store.snapshot();
    assert.equal(snap.eventCount, 2);
    assert.equal(snap.events.length, 2);
    assert.ok(snap.id.startsWith('evt-'));
  });

  it('clear removes all events', () => {
    const store = new EventStore();
    const execId = makeExecutionId();
    store.append(goalCreated(execId));
    store.clear();
    assert.equal(store.size, 0);
  });
});

// ─── TimelineBuilder ──────────────────────────────────────────────────────────

describe('TimelineBuilder', () => {
  it('builds empty timeline for no events', () => {
    const tb = new TimelineBuilder();
    const tl = tb.build([]);
    assert.equal(tl.totalEvents, 0);
    assert.equal(tl.roots.length, 0);
  });

  it('builds causal parent/child relationships', () => {
    const tb = new TimelineBuilder();
    const execId = makeExecutionId();
    const parent = goalCreated(execId);
    const child = stepExecuted(execId, 'success', parent.id);
    const tl = tb.build([parent, child]);
    assert.equal(tl.roots.length, 1);
    assert.equal(tl.roots[0].children.length, 1);
    assert.equal(tl.roots[0].children[0].event.id, child.id);
  });

  it('criticalMoments identifies failures and recoveries', () => {
    const tb = new TimelineBuilder();
    const execId = makeExecutionId();
    const fail = stepExecuted(execId, 'failure');
    const recovery = createEvent<CognitiveEvent>({
      executionId: execId,
      eventType: 'recovery:triggered',
      payload: { strategyId: 's1', reason: 'retry after timeout' },
    } as Parameters<typeof createEvent>[0]);
    const moments = tb.criticalMoments([fail, recovery]);
    assert.equal(moments.length, 2);
  });

  it('failures returns only failed steps', () => {
    const tb = new TimelineBuilder();
    const execId = makeExecutionId();
    const events = [stepExecuted(execId, 'success'), stepExecuted(execId, 'failure'), stepExecuted(execId, 'success')];
    assert.equal(tb.failures(events).length, 1);
  });

  it('modeTransitions extracts mode switches', () => {
    const tb = new TimelineBuilder();
    const execId = makeExecutionId();
    const modeSwitch = createEvent<CognitiveEvent>({
      executionId: execId,
      eventType: 'mode:switched',
      payload: { fromMode: 'conservative', toMode: 'aggressive', reason: 'low risk' },
    } as Parameters<typeof createEvent>[0]);
    const transitions = tb.modeTransitions([modeSwitch]);
    assert.equal(transitions.length, 1);
    assert.equal(transitions[0].from, 'conservative');
    assert.equal(transitions[0].to, 'aggressive');
  });

  it('rollbackDepth finds maximum depth', () => {
    const tb = new TimelineBuilder();
    const execId = makeExecutionId();
    const rb1 = createEvent<CognitiveEvent>({
      executionId: execId,
      eventType: 'rollback:applied',
      payload: { planId: 'p1', rolledBackSteps: ['s1'], depth: 2 },
    } as Parameters<typeof createEvent>[0]);
    const rb2 = createEvent<CognitiveEvent>({
      executionId: execId,
      eventType: 'rollback:applied',
      payload: { planId: 'p1', rolledBackSteps: ['s1', 's2', 's3'], depth: 5 },
    } as Parameters<typeof createEvent>[0]);
    assert.equal(tb.rollbackDepth([rb1, rb2]), 5);
  });
});

// ─── SnapshotManager ──────────────────────────────────────────────────────────

describe('SnapshotManager', () => {
  function makeSource(): SnapshotSource {
    return {
      getWorkingMemoryState: () => ({ items: [] }),
      getEpisodicMemoryState: () => ({ episodes: [] }),
      getSemanticMemoryState: () => ({ concepts: [] }),
      getProceduralMemoryState: () => ({ procedures: [] }),
      getTrustState: (): TrustSnapshot => ({
        successCount: 3,
        failureCount: 1,
        chunkReliability: {},
      }),
    };
  }

  it('creates a snapshot with correct structure', () => {
    const sm = new SnapshotManager();
    const execId = makeExecutionId();
    const snap = sm.createSnapshot(execId, makeSource());
    assert.equal(snap.executionId, execId);
    assert.ok(snap.id.startsWith('snap-'));
    assert.deepEqual(snap.trust.successCount, 3);
  });

  it('restores snapshot by id', () => {
    const sm = new SnapshotManager();
    const execId = makeExecutionId();
    const snap = sm.createSnapshot(execId, makeSource());
    const restored = sm.restoreSnapshot(snap.id);
    assert.ok(restored);
    assert.equal(restored!.id, snap.id);
  });

  it('latest returns most recent snapshot', () => {
    const sm = new SnapshotManager();
    const execId = makeExecutionId();
    sm.createSnapshot(execId, makeSource());
    const snap2 = sm.createSnapshot(execId, makeSource());
    assert.equal(sm.latest()!.id, snap2.id);
  });

  it('list returns all snapshots newest-first', () => {
    const sm = new SnapshotManager();
    const execId = makeExecutionId();
    sm.createSnapshot(execId, makeSource());
    sm.createSnapshot(execId, makeSource());
    const list = sm.list();
    assert.equal(list.length, 2);
    assert.ok(list[0].createdAt >= list[1].createdAt);
  });

  it('latestForExecution scopes to execution', () => {
    const sm = new SnapshotManager();
    const e1 = makeExecutionId();
    const e2 = makeExecutionId();
    sm.createSnapshot(e1, makeSource());
    const snap2 = sm.createSnapshot(e2, makeSource());
    assert.equal(sm.latestForExecution(e2)!.id, snap2.id);
    assert.ok(sm.latestForExecution(e1) !== undefined);
    assert.ok(sm.latestForExecution('nonexistent') === undefined);
  });
});

// ─── ReplayEngine ─────────────────────────────────────────────────────────────

describe('ReplayEngine', () => {
  it('replays all events for executionId', async () => {
    const store = new EventStore();
    const sm = new SnapshotManager();
    const engine = new ReplayEngine(store, sm);
    const execId = makeExecutionId();
    store.appendBatch([goalCreated(execId), stepExecuted(execId), stepExecuted(execId)]);
    const replayed: CognitiveEvent[] = [];
    engine.onEvent(e => { replayed.push(e); });
    const result = await engine.replay(execId);
    assert.equal(result.eventsReplayed, 3);
    assert.equal(replayed.length, 3);
    assert.equal(result.fromSnapshot, false);
  });

  it('replayFrom uses snapshot as starting point', async () => {
    const store = new EventStore();
    const sm = new SnapshotManager();
    const engine = new ReplayEngine(store, sm);
    const execId = makeExecutionId();

    const e1 = goalCreated(execId);
    store.append(e1);

    // create snapshot after first event
    const snapSource = {
      getWorkingMemoryState: () => ({}),
      getEpisodicMemoryState: () => ({}),
      getSemanticMemoryState: () => ({}),
      getProceduralMemoryState: () => ({}),
      getTrustState: (): TrustSnapshot => ({ successCount: 0, failureCount: 0, chunkReliability: {} }),
    };
    const snap = sm.createSnapshot(execId, snapSource);

    // events after snapshot
    const e2 = stepExecuted(execId);
    const e3 = stepExecuted(execId);
    store.appendBatch([e2, e3]);

    const replayed: CognitiveEvent[] = [];
    engine.onEvent(e => { replayed.push(e); });
    const result = await engine.replayFrom(snap.id);
    // only events after snapshot timestamp
    assert.equal(result.fromSnapshot, true);
    assert.equal(result.snapshotId, snap.id);
  });

  it('replayFrom throws for unknown snapshot', async () => {
    const store = new EventStore();
    const sm = new SnapshotManager();
    const engine = new ReplayEngine(store, sm);
    await assert.rejects(() => engine.replayFrom('nonexistent'), /Snapshot not found/);
  });

  it('dryReplay counts event types and causal chains', async () => {
    const store = new EventStore();
    const sm = new SnapshotManager();
    const engine = new ReplayEngine(store, sm);
    const execId = makeExecutionId();
    const e1 = goalCreated(execId);
    const e2 = stepExecuted(execId, 'success', e1.id);
    const e3 = stepExecuted(execId, 'failure', e1.id);
    const result = await engine.dryReplay([e1, e2, e3]);
    assert.equal(result.eventsProcessed, 3);
    assert.equal(result.eventTypes['goal:created'], 1);
    assert.equal(result.eventTypes['step:executed'], 2);
    assert.equal(result.causalChains, 2);
    assert.equal(result.orphanedEvents, 0);
  });

  it('dryReplay detects orphaned causations', async () => {
    const store = new EventStore();
    const sm = new SnapshotManager();
    const engine = new ReplayEngine(store, sm);
    const execId = makeExecutionId();
    const e1 = stepExecuted(execId, 'success', 'ghost-id');
    const result = await engine.dryReplay([e1]);
    assert.equal(result.orphanedEvents, 1);
  });
});
