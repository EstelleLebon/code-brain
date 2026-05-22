"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const TransactionCoordinator_js_1 = require("../transactions/TransactionCoordinator.js");
(0, node_test_1.describe)('TransactionCoordinator', () => {
    (0, node_test_1.test)('success path: commits and returns success', async () => {
        const db = new better_sqlite3_1.default(':memory:');
        db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)');
        const coordinator = new TransactionCoordinator_js_1.TransactionCoordinator(db);
        const result = await coordinator.execute(async (_txn) => {
            db.prepare('INSERT INTO test (id, val) VALUES (?, ?)').run('1', 'hello');
            return 'done';
        });
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.rolledBack, false);
        strict_1.default.equal(result.data, 'done');
        strict_1.default.ok(result.transactionId.startsWith('txn_'));
        strict_1.default.ok(result.durationMs >= 0);
        strict_1.default.equal(result.error, undefined);
        const row = db.prepare('SELECT val FROM test WHERE id = ?').get('1');
        strict_1.default.equal(row?.val, 'hello');
        db.close();
    });
    (0, node_test_1.test)('failure path: rolls back and records error', async () => {
        const db = new better_sqlite3_1.default(':memory:');
        db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)');
        const coordinator = new TransactionCoordinator_js_1.TransactionCoordinator(db);
        const result = await coordinator.execute(async (_txn) => {
            db.prepare('INSERT INTO test (id, val) VALUES (?, ?)').run('1', 'will rollback');
            throw new Error('intentional failure');
        });
        strict_1.default.equal(result.success, false);
        strict_1.default.equal(result.rolledBack, true);
        strict_1.default.equal(result.error, 'intentional failure');
        strict_1.default.equal(result.data, undefined);
        const row = db.prepare('SELECT val FROM test WHERE id = ?').get('1');
        strict_1.default.equal(row, undefined); // rolled back
        const rm = coordinator.getRollbackManager();
        strict_1.default.equal(rm.getCount(), 1);
        const history = rm.getHistory();
        strict_1.default.equal(history[0].reason, 'intentional failure');
        db.close();
    });
    (0, node_test_1.test)('multiple transactions accumulate rollback count', async () => {
        const db = new better_sqlite3_1.default(':memory:');
        const coordinator = new TransactionCoordinator_js_1.TransactionCoordinator(db);
        await coordinator.execute(async () => { throw new Error('fail 1'); });
        await coordinator.execute(async () => { throw new Error('fail 2'); });
        const ok = await coordinator.execute(async () => 42);
        strict_1.default.equal(coordinator.getRollbackManager().getCount(), 2);
        strict_1.default.equal(ok.success, true);
        db.close();
    });
});
//# sourceMappingURL=transactions.test.js.map