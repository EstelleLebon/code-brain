"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const schema_js_1 = require("../models/schema.js");
const ReplayLogStore_js_1 = require("../persistence/replay/ReplayLogStore.js");
const RuntimeReplayStore_js_1 = require("../persistence/replay/RuntimeReplayStore.js");
const SemanticReplayStore_js_1 = require("../persistence/replay/SemanticReplayStore.js");
const SessionStore_js_1 = require("../persistence/sessions/SessionStore.js");
const FailureMemoryStore_js_1 = require("../persistence/failure-memory/FailureMemoryStore.js");
const CalibrationStore_js_1 = require("../persistence/calibration/CalibrationStore.js");
function makeDb() {
    const db = new better_sqlite3_1.default(':memory:');
    db.pragma('journal_mode = WAL');
    db.exec(schema_js_1.CREATE_TABLES_SQL);
    for (const m of schema_js_1.MIGRATIONS) {
        if (m.sql)
            db.exec(m.sql);
    }
    return db;
}
(0, node_test_1.describe)('ReplayLogStore', () => {
    (0, node_test_1.test)('append and query by operation', () => {
        const db = makeDb();
        const store = new ReplayLogStore_js_1.ReplayLogStore(db);
        store.append({ id: 'e1', timestamp: 1000, eventType: 'file_changed', artifactIds: ['a', 'b'], transactionId: 'txn-1' });
        store.append({ id: 'e2', timestamp: 2000, eventType: 'transaction_committed', artifactIds: [], transactionId: 'txn-2' });
        const byOp = store.byOperation('txn-1');
        strict_1.default.equal(byOp.length, 1);
        strict_1.default.equal(byOp[0].eventType, 'file_changed');
        strict_1.default.deepEqual(byOp[0].artifactIds, ['a', 'b']);
    });
    (0, node_test_1.test)('query since timestamp', () => {
        const db = makeDb();
        const store = new ReplayLogStore_js_1.ReplayLogStore(db);
        store.append({ id: 'e1', timestamp: 100, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-1' });
        store.append({ id: 'e2', timestamp: 500, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-2' });
        const results = store.query({ since: 300 });
        strict_1.default.equal(results.length, 1);
        strict_1.default.equal(results[0].id, 'e2');
    });
    (0, node_test_1.test)('clear removes all events', () => {
        const db = makeDb();
        const store = new ReplayLogStore_js_1.ReplayLogStore(db);
        store.append({ id: 'e1', timestamp: 100, eventType: 'file_changed', artifactIds: [], transactionId: 'txn-1' });
        store.clear();
        strict_1.default.equal(store.query().length, 0);
    });
});
(0, node_test_1.describe)('RuntimeReplayStore', () => {
    (0, node_test_1.test)('append and byOperation', () => {
        const db = makeDb();
        const store = new RuntimeReplayStore_js_1.RuntimeReplayStore(db);
        store.append({ id: 'rre-1', operationId: 'op-1', outcomeId: 'out-1', causedRollback: false, runtimeSignals: ['sig-a'], timestamp: 1000 });
        store.append({ id: 'rre-2', operationId: 'op-2', outcomeId: 'out-2', causedRollback: true, runtimeSignals: [], timestamp: 2000 });
        strict_1.default.equal(store.byOperation('op-1').length, 1);
        strict_1.default.equal(store.rollbacks().length, 1);
        strict_1.default.equal(store.rollbacks()[0].id, 'rre-2');
    });
    (0, node_test_1.test)('query causedRollback filter', () => {
        const db = makeDb();
        const store = new RuntimeReplayStore_js_1.RuntimeReplayStore(db);
        store.append({ id: 'r1', operationId: 'op-1', outcomeId: 'o1', causedRollback: true, runtimeSignals: [], timestamp: 100 });
        store.append({ id: 'r2', operationId: 'op-2', outcomeId: 'o2', causedRollback: false, runtimeSignals: [], timestamp: 200 });
        const rollbacks = store.query({ causedRollback: true });
        strict_1.default.equal(rollbacks.length, 1);
        strict_1.default.equal(rollbacks[0].causedRollback, true);
    });
});
(0, node_test_1.describe)('SemanticReplayStore', () => {
    (0, node_test_1.test)('append, byOperation, byTransformation', () => {
        const db = makeDb();
        const store = new SemanticReplayStore_js_1.SemanticReplayStore(db);
        store.append({ id: 's1', operationId: 'op-1', transformationType: 'rename', payload: { from: 'foo', to: 'bar' }, timestamp: 100 });
        store.append({ id: 's2', operationId: 'op-1', transformationType: 'extract', payload: { name: 'baz' }, timestamp: 200 });
        store.append({ id: 's3', operationId: 'op-2', transformationType: 'rename', payload: { from: 'x', to: 'y' }, timestamp: 300 });
        strict_1.default.equal(store.byOperation('op-1').length, 2);
        strict_1.default.equal(store.byTransformation('rename').length, 2);
        strict_1.default.equal(store.byTransformation('extract').length, 1);
        strict_1.default.deepEqual(store.byTransformation('extract')[0].payload, { name: 'baz' });
    });
});
(0, node_test_1.describe)('SessionStore', () => {
    (0, node_test_1.test)('save and load session', () => {
        const db = makeDb();
        const store = new SessionStore_js_1.SessionStore(db);
        const session = {
            id: 'sess-1',
            startedAt: 1000,
            entries: new Map([['sym-a', { symbolId: 'sym-a', filePath: 'src/a.ts', accessCount: 3, lastAccessedAt: 2000 }]]),
            focusFiles: new Set(['src/a.ts']),
        };
        store.save(session);
        const loaded = store.load('sess-1');
        strict_1.default.ok(loaded !== null);
        strict_1.default.equal(loaded.id, 'sess-1');
        strict_1.default.equal(loaded.entries.get('sym-a')?.accessCount, 3);
        strict_1.default.ok(loaded.focusFiles.has('src/a.ts'));
    });
    (0, node_test_1.test)('restoreSessions returns all saved sessions', () => {
        const db = makeDb();
        const store = new SessionStore_js_1.SessionStore(db);
        for (let i = 0; i < 3; i++) {
            store.save({ id: `sess-${i}`, startedAt: i * 1000, entries: new Map(), focusFiles: new Set() });
        }
        const sessions = store.restoreSessions();
        strict_1.default.equal(sessions.length, 3);
    });
    (0, node_test_1.test)('delete removes session', () => {
        const db = makeDb();
        const store = new SessionStore_js_1.SessionStore(db);
        store.save({ id: 'sess-x', startedAt: 0, entries: new Map(), focusFiles: new Set() });
        store.delete('sess-x');
        strict_1.default.equal(store.load('sess-x'), null);
    });
});
(0, node_test_1.describe)('FailureMemoryStore', () => {
    (0, node_test_1.test)('save and loadAll', () => {
        const db = makeDb();
        const store = new FailureMemoryStore_js_1.FailureMemoryStore(db);
        const pattern = { id: 'fp-1', operationType: 'rename', structuralContext: ['ctx-a'], runtimeConsequences: ['build:fail'], frequency: 2, severity: 0.7, lastSeen: Date.now() };
        store.save(pattern);
        const all = store.loadAll();
        strict_1.default.equal(all.length, 1);
        strict_1.default.equal(all[0].id, 'fp-1');
        strict_1.default.deepEqual(all[0].structuralContext, ['ctx-a']);
    });
    (0, node_test_1.test)('upsert updates existing pattern', () => {
        const db = makeDb();
        const store = new FailureMemoryStore_js_1.FailureMemoryStore(db);
        const base = { id: 'fp-1', operationType: 'rename', structuralContext: ['ctx-a'], runtimeConsequences: [], frequency: 1, severity: 0.3, lastSeen: 100 };
        store.save(base);
        store.save({ ...base, frequency: 5, severity: 0.8, lastSeen: 999 });
        const all = store.loadAll();
        strict_1.default.equal(all.length, 1);
        strict_1.default.equal(all[0].frequency, 5);
        strict_1.default.equal(all[0].severity, 0.8);
    });
    (0, node_test_1.test)('loadByOperationType filters correctly', () => {
        const db = makeDb();
        const store = new FailureMemoryStore_js_1.FailureMemoryStore(db);
        store.save({ id: 'fp-1', operationType: 'rename', structuralContext: [], runtimeConsequences: [], frequency: 1, severity: 0.5, lastSeen: 100 });
        store.save({ id: 'fp-2', operationType: 'extract', structuralContext: [], runtimeConsequences: [], frequency: 1, severity: 0.5, lastSeen: 100 });
        strict_1.default.equal(store.loadByOperationType('rename').length, 1);
        strict_1.default.equal(store.loadByOperationType('extract').length, 1);
        strict_1.default.equal(store.loadByOperationType('delete').length, 0);
    });
});
(0, node_test_1.describe)('CalibrationStore', () => {
    (0, node_test_1.test)('save and loadAll', () => {
        const db = makeDb();
        const store = new CalibrationStore_js_1.CalibrationStore(db);
        store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 15, timestamp: 1000 });
        store.save({ id: 'c2', operationType: 'rename', predictedRisk: 40, observedRisk: 50, calibrationDelta: 10, timestamp: 2000 });
        const all = store.loadAll();
        strict_1.default.equal(all.length, 2);
    });
    (0, node_test_1.test)('averageDelta returns correct average', () => {
        const db = makeDb();
        const store = new CalibrationStore_js_1.CalibrationStore(db);
        store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 10, timestamp: 1000 });
        store.save({ id: 'c2', operationType: 'rename', predictedRisk: 40, observedRisk: 50, calibrationDelta: 20, timestamp: 2000 });
        const avg = store.averageDelta('rename');
        strict_1.default.ok(avg !== null);
        strict_1.default.equal(avg, 15);
    });
    (0, node_test_1.test)('loadByOperationType isolates types', () => {
        const db = makeDb();
        const store = new CalibrationStore_js_1.CalibrationStore(db);
        store.save({ id: 'c1', operationType: 'rename', predictedRisk: 30, observedRisk: 45, calibrationDelta: 10, timestamp: 1000 });
        store.save({ id: 'c2', operationType: 'extract', predictedRisk: 20, observedRisk: 25, calibrationDelta: 5, timestamp: 2000 });
        strict_1.default.equal(store.loadByOperationType('rename').length, 1);
        strict_1.default.equal(store.loadByOperationType('extract').length, 1);
    });
});
//# sourceMappingURL=persistent-memory.test.js.map