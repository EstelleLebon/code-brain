"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SemanticReplayLog_js_1 = require("../semantic-replay/SemanticReplayLog.js");
(0, node_test_1.describe)('SemanticReplayLog', () => {
    (0, node_test_1.it)('records and retrieves events', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: ['a.ts'], status: 'applied' });
        strict_1.default.equal(log.size, 1);
    });
    (0, node_test_1.it)('filters by operationType', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        log.record({ operationId: 'op2', operationType: 'move_function', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        const results = log.query({ operationType: 'rename_symbol' });
        strict_1.default.equal(results.length, 1);
        strict_1.default.equal(results[0].operationType, 'rename_symbol');
    });
    (0, node_test_1.it)('filters by status', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        log.record({ operationId: 'op2', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'failed' });
        strict_1.default.equal(log.query({ status: 'applied' }).length, 1);
        strict_1.default.equal(log.query({ status: 'failed' }).length, 1);
    });
    (0, node_test_1.it)('canReplay returns true when all events applied', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        strict_1.default.equal(log.canReplay('xfm1'), true);
    });
    (0, node_test_1.it)('canReplay returns false when any event failed', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        log.record({ operationId: 'op2', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'failed' });
        strict_1.default.equal(log.canReplay('xfm1'), false);
    });
    (0, node_test_1.it)('clear resets the log', () => {
        const log = new SemanticReplayLog_js_1.SemanticReplayLog();
        log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
        log.clear();
        strict_1.default.equal(log.size, 0);
    });
});
//# sourceMappingURL=semantic-replay.test.js.map