"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RuntimeReplayLog_js_1 = require("../runtime-replay/RuntimeReplayLog.js");
const CausalityGraph_js_1 = require("../runtime-replay/CausalityGraph.js");
(0, node_test_1.describe)('RuntimeReplayLog', () => {
    (0, node_test_1.it)('records and retrieves events', () => {
        const log = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        log.record('op-1', ['sig-a', 'sig-b'], 'outcome-1', false);
        strict_1.default.equal(log.all().length, 1);
    });
    (0, node_test_1.it)('query by operationId', () => {
        const log = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        log.record('op-1', [], 'outcome-1', false);
        log.record('op-2', [], 'outcome-2', true);
        strict_1.default.equal(log.forOperation('op-1').length, 1);
        strict_1.default.equal(log.forOperation('op-2').length, 1);
    });
    (0, node_test_1.it)('rollbacks returns only rollback events', () => {
        const log = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        log.record('op-1', [], 'o1', true);
        log.record('op-2', [], 'o2', false);
        strict_1.default.equal(log.rollbacks().length, 1);
    });
    (0, node_test_1.it)('clear empties the log', () => {
        const log = new RuntimeReplayLog_js_1.RuntimeReplayLog();
        log.record('op-1', [], 'o1', false);
        log.clear();
        strict_1.default.equal(log.all().length, 0);
    });
});
(0, node_test_1.describe)('CausalityGraphBuilder', () => {
    (0, node_test_1.it)('addEdge registers nodes and edges', () => {
        const g = new CausalityGraph_js_1.CausalityGraphBuilder();
        g.addEdge('op-1', 'outcome-1', 'caused').addEdge('outcome-1', 'rollback-1', 'triggered');
        const graph = g.build();
        strict_1.default.ok(graph.nodes.includes('op-1'));
        strict_1.default.ok(graph.nodes.includes('outcome-1'));
        strict_1.default.equal(graph.edges.length, 2);
    });
    (0, node_test_1.it)('ancestors traversal', () => {
        const g = new CausalityGraph_js_1.CausalityGraphBuilder();
        g.addEdge('op-1', 'op-2', 'before').addEdge('op-2', 'op-3', 'before');
        const ancestors = g.ancestors('op-3');
        strict_1.default.ok(ancestors.includes('op-2'));
        strict_1.default.ok(ancestors.includes('op-1'));
    });
    (0, node_test_1.it)('descendants traversal', () => {
        const g = new CausalityGraph_js_1.CausalityGraphBuilder();
        g.addEdge('root', 'child-a', 'caused').addEdge('root', 'child-b', 'caused');
        const desc = g.descendants('root');
        strict_1.default.ok(desc.includes('child-a'));
        strict_1.default.ok(desc.includes('child-b'));
    });
});
//# sourceMappingURL=runtime-replay.test.js.map