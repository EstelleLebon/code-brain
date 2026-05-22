"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalityGraphBuilder = void 0;
class CausalityGraphBuilder {
    nodes = new Set();
    edges = [];
    addEdge(from, to, label) {
        this.nodes.add(from);
        this.nodes.add(to);
        this.edges.push({ from, to, label });
        return this;
    }
    build() {
        return { nodes: [...this.nodes], edges: [...this.edges] };
    }
    ancestors(nodeId) {
        const result = [];
        const visited = new Set();
        const queue = [nodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            for (const edge of this.edges) {
                if (edge.to === current && !visited.has(edge.from)) {
                    visited.add(edge.from);
                    result.push(edge.from);
                    queue.push(edge.from);
                }
            }
        }
        return result;
    }
    descendants(nodeId) {
        const result = [];
        const visited = new Set();
        const queue = [nodeId];
        while (queue.length > 0) {
            const current = queue.shift();
            for (const edge of this.edges) {
                if (edge.from === current && !visited.has(edge.to)) {
                    visited.add(edge.to);
                    result.push(edge.to);
                    queue.push(edge.to);
                }
            }
        }
        return result;
    }
}
exports.CausalityGraphBuilder = CausalityGraphBuilder;
//# sourceMappingURL=CausalityGraph.js.map