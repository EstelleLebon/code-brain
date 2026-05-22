"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ReplayLog_js_1 = require("../replay/ReplayLog.js");
(0, node_test_1.describe)('ReplayLog', () => {
    (0, node_test_1.test)('record and getEvents', () => {
        const log = new ReplayLog_js_1.ReplayLog();
        const evt = log.record('file_changed', ['a', 'b'], 'txn_1');
        strict_1.default.equal(log.getEvents().length, 1);
        strict_1.default.equal(log.getEvents()[0].eventType, 'file_changed');
        strict_1.default.deepEqual(log.getEvents()[0].artifactIds, ['a', 'b']);
        strict_1.default.equal(log.getEvents()[0].transactionId, 'txn_1');
        strict_1.default.ok(evt.id.startsWith('evt_'));
    });
    (0, node_test_1.test)('getEventsByType filters correctly', () => {
        const log = new ReplayLog_js_1.ReplayLog();
        log.record('file_changed', [], 'txn_1');
        log.record('transaction_committed', [], 'txn_2');
        log.record('file_changed', [], 'txn_3');
        const changed = log.getEventsByType('file_changed');
        strict_1.default.equal(changed.length, 2);
        strict_1.default.ok(changed.every(e => e.eventType === 'file_changed'));
    });
    (0, node_test_1.test)('getEventsByTransaction filters correctly', () => {
        const log = new ReplayLog_js_1.ReplayLog();
        log.record('file_changed', [], 'txn_A');
        log.record('invalidation_started', [], 'txn_B');
        log.record('recompute_completed', [], 'txn_A');
        const txnA = log.getEventsByTransaction('txn_A');
        strict_1.default.equal(txnA.length, 2);
        strict_1.default.ok(txnA.every(e => e.transactionId === 'txn_A'));
    });
    (0, node_test_1.test)('since filters by timestamp', async () => {
        const log = new ReplayLog_js_1.ReplayLog();
        log.record('file_changed', [], 'txn_1');
        const before = Date.now();
        await new Promise(r => setTimeout(r, 5));
        log.record('transaction_committed', [], 'txn_2');
        const recent = log.since(before + 1);
        strict_1.default.equal(recent.length, 1);
        strict_1.default.equal(recent[0].eventType, 'transaction_committed');
    });
    (0, node_test_1.test)('clear removes all events', () => {
        const log = new ReplayLog_js_1.ReplayLog();
        log.record('file_changed', [], 'txn_1');
        log.record('file_changed', [], 'txn_2');
        strict_1.default.equal(log.getEvents().length, 2);
        log.clear();
        strict_1.default.equal(log.getEvents().length, 0);
    });
    (0, node_test_1.test)('metadata is stored', () => {
        const log = new ReplayLog_js_1.ReplayLog();
        log.record('contradiction_detected', ['sym_1'], 'txn_1', { severity: 'high' });
        const evt = log.getEvents()[0];
        strict_1.default.deepEqual(evt.metadata, { severity: 'high' });
    });
});
//# sourceMappingURL=replay.test.js.map