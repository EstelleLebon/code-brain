import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { MIGRATIONS, CREATE_TABLES_SQL } from '../models/schema.js';
import { ReplayLogStore } from '../persistence/replay/ReplayLogStore.js';
import { RuntimeReplayStore } from '../persistence/replay/RuntimeReplayStore.js';
import { SemanticReplayStore } from '../persistence/replay/SemanticReplayStore.js';
import { SessionStore } from '../persistence/sessions/SessionStore.js';
import { FailureMemoryStore } from '../persistence/failure-memory/FailureMemoryStore.js';
import { CalibrationStore } from '../persistence/calibration/CalibrationStore.js';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(CREATE_TABLES_SQL);
  for (const m of MIGRATIONS) {
    if (m.sql) db.exec(m.sql);
  }
  return db;
}

describe('ReplayLogStore', () => {
  test('append and query by operation', () => {
    const db = makeDb();
    const store = new ReplayLogStore(db);
    store.append({ id: 'e1', timestamp: 1000, eventType: 'file_changed', artifactIds: ['a', 'b'], transactionId: 'txn-1' });
    store.append({ id: 'e2', timestamp: 2000, eventType: 'transaction_committed', artifactIds: [], transactionId: 'txn-2' });
    const byOp = store.byOperation('txn-1');
    assert.equal(byOp.length, 1);
    assert.equal(byOp[0].eventType, 'file_changed');
    assert.deepEqual(byOp[0].artifactIds, ['a', 'b']);
  });

  test('query since timestamp', () => {
    const db = makeDb();
    const store = new ReplayLogStore(db);
    store.append({ id: 'e1', timestamp: 100, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-1' });
    store.append({ id: 'e2', timestamp: 500, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-2' });
    const results = store.query({ since: 300 });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'e2');
  });

  test('clear removes all events', () => {
    const db = makeDb();
    const store = new ReplayLogStore(db);
    store.append({ id: 'e1', timestamp: 100, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-1' });
    store.clear();
    assert.equal(store.query().length, 0);
  });
});

describe('RuntimeReplayStore', () => {
  test('append and byOperation', () => {
    const db = makeDb();
    const store = new RuntimeReplayStore(db);
    store.append({ id: 'rre-1', operationId: 'op-1', outcomeId: 'out-1', causedRollback: false, runtimeSignals: ['sig-a'], timestamp: 1000 });
    store.append({ id: 'rre-2', operationId: 'op-2', outcomeId: 'out-2', causedRollback: true, runtimeSignals: [], timestamp: 2000 });
    assert.equal(store.byOperation('op-1').length, 1);
    assert.equal(store.rollbacks().length, 1);
    assert.equal(store.rollbacks()[0].id, 'rre-2');
  });

  test('query causedRollback filter', () => {
    const db = makeDb();
    const store = new RuntimeReplayStore(db);
    store.append({ id: 'r1', operationId: 'op-1', outcomeId: 'o1', causedRollback: true, runtimeSignals: [], timestamp: 100 });
    store.append({ id: 'r2', operationId: 'op-2', outcomeId: 'o2', causedRollback: false, runtimeSignals: [], timestamp: 200 });
    const rollbacks = store.query({ causedRollback: true });
    assert.equal(rollbacks.length, 1);
    assert.equal(rollbacks[0].causedRollback, true);
  });
});

describe('SemanticReplayStore', () => {
  test('append, byOperation, byTransformation', () => {
    const db = makeDb();
    const store = new SemanticReplayStore(db);
    store.append({ id: 's1', operationId: 'op-1', transformationType: 'rename', payload: { from: 'foo', to: 'bar' }, timestamp: 100 });
    store.append({ id: 's2', operationId: 'op-1', transformationType: 'extract', payload: { name: 'baz' }, timestamp: 200 });
    store.append({ id: 's3', operationId: 'op-2', transformationType: 'rename', payload: { from: 'x', to: 'y' }, timestamp: 300 });
    assert.equal(store.byOperation('op-1').length, 2);
    assert.equal(store.byTransformation('rename').length, 2);
    assert.equal(store.byTransformation('extract').length, 1);
    assert.deepEqual(store.byTransformation('extract')[0].payload, { name: 'baz' });
  });
});

describe('SessionStore', () => {
  test('save and load session', () => {
    const db = makeDb();
    const store = new SessionStore(db);
    const session = {
      id: 'sess-1',
      startedAt: 1000,
      entries: new Map([['sym-a', { symbolId: 'sym-a', filePath: 'src/a.ts', accessCount: 3, lastAccessedAt: 2000 }]]),
      focusFiles: new Set(['src/a.ts']),
    };
    store.save(session);
    const loaded = store.load('sess-1');
    assert.ok(loaded !== null);
    assert.equal(loaded!.id, 'sess-1');
    assert.equal(loaded!.entries.get('sym-a')?.accessCount, 3);
    assert.ok(loaded!.focusFiles.has('src/a.ts'));
  });

  test('restoreSessions returns all saved sessions', () => {
    const db = makeDb();
    const store = new SessionStore(db);
    for (let i = 0; i < 3; i++) {
      store.save({ id: `sess-${i}`, startedAt: i * 1000, entries: new Map(), focusFiles: new Set() });
    }
    const sessions = store.restoreSessions();
    assert.equal(sessions.length, 3);
  });

  test('delete removes session', () => {
    const db = makeDb();
    const store = new SessionStore(db);
    store.save({ id: 'sess-x', startedAt: 0, entries: new Map(), focusFiles: new Set() });
    store.delete('sess-x');
    assert.equal(store.load('sess-x'), null);
  });
});

describe('FailureMemoryStore', () => {
  test('save and loadAll', () => {
    const db = makeDb();
    const store = new FailureMemoryStore(db);
    const pattern = { id: 'fp-1', operationType: 'rename', structuralContext: ['ctx-a'], runtimeConsequences: ['build:fail'], frequency: 2, severity: 0.7, lastSeen: Date.now() };
    store.save(pattern);
    const all = store.loadAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'fp-1');
    assert.deepEqual(all[0].structuralContext, ['ctx-a']);
  });

  test('upsert updates existing pattern', () => {
    const db = makeDb();
    const store = new FailureMemoryStore(db);
    const base = { id: 'fp-1', operationType: 'rename', structuralContext: ['ctx-a'], runtimeConsequences: [], frequency: 1, severity: 0.3, lastSeen: 100 };
    store.save(base);
    store.save({ ...base, frequency: 5, severity: 0.8, lastSeen: 999 });
    const all = store.loadAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].frequency, 5);
    assert.equal(all[0].severity, 0.8);
  });

  test('loadByOperationType filters correctly', () => {
    const db = makeDb();
    const store = new FailureMemoryStore(db);
    store.save({ id: 'fp-1', operationType: 'rename', structuralContext: [], runtimeConsequences: [], frequency: 1, severity: 0.5, lastSeen: 100 });
    store.save({ id: 'fp-2', operationType: 'extract', structuralContext: [], runtimeConsequences: [], frequency: 1, severity: 0.5, lastSeen: 100 });
    assert.equal(store.loadByOperationType('rename').length, 1);
    assert.equal(store.loadByOperationType('extract').length, 1);
    assert.equal(store.loadByOperationType('delete').length, 0);
  });
});

describe('CalibrationStore', () => {
  test('save and loadAll', () => {
    const db = makeDb();
    const store = new CalibrationStore(db);
    store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 15, timestamp: 1000 });
    store.save({ id: 'c2', operationType: 'rename', predictedRisk: 40, observedRisk: 50, calibrationDelta: 10, timestamp: 2000 });
    const all = store.loadAll();
    assert.equal(all.length, 2);
  });

  test('averageDelta returns correct average', () => {
    const db = makeDb();
    const store = new CalibrationStore(db);
    store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 10, timestamp: 1000 });
    store.save({ id: 'c2', operationType: 'rename', predictedRisk: 40, observedRisk: 50, calibrationDelta: 20, timestamp: 2000 });
    const avg = store.averageDelta('rename');
    assert.ok(avg !== null);
    assert.equal(avg, 15);
  });

  test('loadByOperationType isolates types', () => {
    const db = makeDb();
    const store = new CalibrationStore(db);
    store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 10, timestamp: 1000 });
    store.save({ id: 'c2', operationType: 'extract', predictedRisk: 20, observedRisk: 25, calibrationDelta: 5, timestamp: 2000 });
    assert.equal(store.loadByOperationType('rename').length, 1);
    assert.equal(store.loadByOperationType('extract').length, 1);
  });
});
