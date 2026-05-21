"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const dependency_graph_js_1 = require("../graph/dependency-graph.js");
(0, node_test_1.describe)('DependencyGraph', () => {
    (0, node_test_1.test)('addEdge and getDependencies', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'A', toId: 'C', kind: 'call' });
        const deps = g.getDependencies('A', 1);
        strict_1.default.ok(deps.includes('B'), 'A should depend on B');
        strict_1.default.ok(deps.includes('C'), 'A should depend on C');
        strict_1.default.equal(deps.length, 2);
    });
    (0, node_test_1.test)('getDependents (reverse edges)', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });
        g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
        const dependents = g.getDependents('C', 1);
        strict_1.default.ok(dependents.includes('A'), 'C should have A as dependent');
        strict_1.default.ok(dependents.includes('B'), 'C should have B as dependent');
        strict_1.default.equal(dependents.length, 2);
    });
    (0, node_test_1.test)('deep dependency traversal', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
        g.addEdge({ fromId: 'C', toId: 'D', kind: 'import' });
        const deps = g.getDependencies('A', 3);
        strict_1.default.ok(deps.includes('B'));
        strict_1.default.ok(deps.includes('C'));
    });
    (0, node_test_1.test)('detects circular dependency', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
        g.addEdge({ fromId: 'C', toId: 'A', kind: 'import' });
        strict_1.default.equal(g.hasCircularDependency('A'), true);
    });
    (0, node_test_1.test)('no circular dependency in DAG', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
        g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });
        strict_1.default.equal(g.hasCircularDependency('A'), false);
    });
    (0, node_test_1.test)('detectCycles returns cycles', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'X', toId: 'Y', kind: 'import' });
        g.addEdge({ fromId: 'Y', toId: 'X', kind: 'import' });
        const cycles = g.detectCycles();
        strict_1.default.ok(cycles.length > 0, 'Should detect at least one cycle');
    });
    (0, node_test_1.test)('removeEdgesFrom clears outgoing edges', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });
        g.removeEdgesFrom('A');
        strict_1.default.equal(g.getDependencies('A', 1).length, 0);
    });
    (0, node_test_1.test)('fromEdges static constructor', () => {
        const edges = [
            { fromId: 'P', toId: 'Q', kind: 'import' },
            { fromId: 'Q', toId: 'R', kind: 'call' },
        ];
        const g = dependency_graph_js_1.DependencyGraph.fromEdges(edges);
        strict_1.default.ok(g.getDependencies('P', 1).includes('Q'));
        strict_1.default.ok(g.getDependencies('Q', 1).includes('R'));
    });
    (0, node_test_1.test)('getAllEdges returns all edges', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.addEdge({ fromId: 'B', toId: 'C', kind: 'extends' });
        const all = g.getAllEdges();
        strict_1.default.equal(all.length, 2);
    });
    (0, node_test_1.test)('edge kind is preserved', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'extends' });
        const kind = g.getEdgeKind('A', 'B');
        strict_1.default.equal(kind, 'extends');
    });
    (0, node_test_1.test)('clear removes all data', () => {
        const g = new dependency_graph_js_1.DependencyGraph();
        g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
        g.clear();
        strict_1.default.equal(g.getEdgeCount(), 0);
        strict_1.default.equal(g.getDependencies('A', 1).length, 0);
    });
});
//# sourceMappingURL=graph.test.js.map