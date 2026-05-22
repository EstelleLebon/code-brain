import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ReplayLog } from '../replay/ReplayLog.js';

describe('ReplayLog', () => {
  test('record and getEvents', () => {
    const log = new ReplayLog();
    const evt = log.record('file_changed', ['a', 'b'], 'txn_1');
    assert.equal(log.getEvents().length, 1);
    assert.equal(log.getEvents()[0].eventType, 'file_changed');
    assert.deepEqual(log.getEvents()[0].artifactIds, ['a', 'b']);
    assert.equal(log.getEvents()[0].transactionId, 'txn_1');
    assert.ok(evt.id.startsWith('evt_'));
  });

  test('getEventsByType filters correctly', () => {
    const log = new ReplayLog();
    log.record('file_changed', [], 'txn_1');
    log.record('transaction_committed', [], 'txn_2');
    log.record('file_changed', [], 'txn_3');

    const changed = log.getEventsByType('file_changed');
    assert.equal(changed.length, 2);
    assert.ok(changed.every(e => e.eventType === 'file_changed'));
  });

  test('getEventsByTransaction filters correctly', () => {
    const log = new ReplayLog();
    log.record('file_changed', [], 'txn_A');
    log.record('invalidation_started', [], 'txn_B');
    log.record('recompute_completed', [], 'txn_A');

    const txnA = log.getEventsByTransaction('txn_A');
    assert.equal(txnA.length, 2);
    assert.ok(txnA.every(e => e.transactionId === 'txn_A'));
  });

  test('since filters by timestamp', async () => {
    const log = new ReplayLog();
    log.record('file_changed', [], 'txn_1');
    const before = Date.now();
    await new Promise(r => setTimeout(r, 5));
    log.record('transaction_committed', [], 'txn_2');

    const recent = log.since(before + 1);
    assert.equal(recent.length, 1);
    assert.equal(recent[0].eventType, 'transaction_committed');
  });

  test('clear removes all events', () => {
    const log = new ReplayLog();
    log.record('file_changed', [], 'txn_1');
    log.record('file_changed', [], 'txn_2');
    assert.equal(log.getEvents().length, 2);
    log.clear();
    assert.equal(log.getEvents().length, 0);
  });

  test('metadata is stored', () => {
    const log = new ReplayLog();
    log.record('contradiction_detected', ['sym_1'], 'txn_1', { severity: 'high' });
    const evt = log.getEvents()[0];
    assert.deepEqual(evt.metadata, { severity: 'high' });
  });
});
