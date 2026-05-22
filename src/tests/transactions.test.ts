import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { TransactionCoordinator } from '../transactions/TransactionCoordinator.js';

describe('TransactionCoordinator', () => {
  test('success path: commits and returns success', async () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)');
    const coordinator = new TransactionCoordinator(db);

    const result = await coordinator.execute(async (_txn) => {
      db.prepare('INSERT INTO test (id, val) VALUES (?, ?)').run('1', 'hello');
      return 'done';
    });

    assert.equal(result.success, true);
    assert.equal(result.rolledBack, false);
    assert.equal(result.data, 'done');
    assert.ok(result.transactionId.startsWith('txn_'));
    assert.ok(result.durationMs >= 0);
    assert.equal(result.error, undefined);

    const row = db.prepare('SELECT val FROM test WHERE id = ?').get('1') as { val: string } | undefined;
    assert.equal(row?.val, 'hello');
    db.close();
  });

  test('failure path: rolls back and records error', async () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT)');
    const coordinator = new TransactionCoordinator(db);

    const result = await coordinator.execute(async (_txn) => {
      db.prepare('INSERT INTO test (id, val) VALUES (?, ?)').run('1', 'will rollback');
      throw new Error('intentional failure');
    });

    assert.equal(result.success, false);
    assert.equal(result.rolledBack, true);
    assert.equal(result.error, 'intentional failure');
    assert.equal(result.data, undefined);

    const row = db.prepare('SELECT val FROM test WHERE id = ?').get('1') as { val: string } | undefined;
    assert.equal(row, undefined); // rolled back

    const rm = coordinator.getRollbackManager();
    assert.equal(rm.getCount(), 1);
    const history = rm.getHistory();
    assert.equal(history[0].reason, 'intentional failure');
    db.close();
  });

  test('multiple transactions accumulate rollback count', async () => {
    const db = new Database(':memory:');
    const coordinator = new TransactionCoordinator(db);

    await coordinator.execute(async () => { throw new Error('fail 1'); });
    await coordinator.execute(async () => { throw new Error('fail 2'); });
    const ok = await coordinator.execute(async () => 42);

    assert.equal(coordinator.getRollbackManager().getCount(), 2);
    assert.equal(ok.success, true);
    db.close();
  });
});
