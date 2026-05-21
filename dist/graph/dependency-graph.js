"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyGraph = void 0;
class DependencyGraph {
    adjacency = new Map();
    reverseAdjacency = new Map();
    edgeKinds = new Map();
    edgeKey(fromId, toId) {
        return `${fromId}→${toId}`;
    }
    addEdge(edge) {
        if (!this.adjacency.has(edge.fromId))
            this.adjacency.set(edge.fromId, new Set());
        if (!this.reverseAdjacency.has(edge.toId))
            this.reverseAdjacency.set(edge.toId, new Set());
        this.adjacency.get(edge.fromId).add(edge.toId);
        this.reverseAdjacency.get(edge.toId).add(edge.fromId);
        this.edgeKinds.set(this.edgeKey(edge.fromId, edge.toId), edge.kind);
    }
    addEdges(edges) {
        for (const edge of edges) {
            this.addEdge(edge);
        }
    }
    removeEdgesFrom(symbolId) {
        const targets = this.adjacency.get(symbolId);
        if (targets) {
            for (const toId of targets) {
                this.reverseAdjacency.get(toId)?.delete(symbolId);
                this.edgeKinds.delete(this.edgeKey(symbolId, toId));
            }
            this.adjacency.delete(symbolId);
        }
    }
    getDependencies(symbolId, depth = 1) {
        if (depth <= 0)
            return [];
        const direct = Array.from(this.adjacency.get(symbolId) ?? []);
        if (depth === 1)
            return direct;
        const visited = new Set([symbolId]);
        const queue = [...direct];
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            result.push(current);
            if (visited.size < depth + 1) {
                const next = Array.from(this.adjacency.get(current) ?? []);
                queue.push(...next.filter(n => !visited.has(n)));
            }
        }
        return result;
    }
    getDependents(symbolId, depth = 1) {
        if (depth <= 0)
            return [];
        const direct = Array.from(this.reverseAdjacency.get(symbolId) ?? []);
        if (depth === 1)
            return direct;
        const visited = new Set([symbolId]);
        const queue = [...direct];
        const result = [];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            result.push(current);
            const next = Array.from(this.reverseAdjacency.get(current) ?? []);
            queue.push(...next.filter(n => !visited.has(n)));
        }
        return result;
    }
    detectCycles() {
        const cycles = [];
        const visited = new Set();
        const inStack = new Set();
        const stack = [];
        const dfs = (node) => {
            visited.add(node);
            inStack.add(node);
            stack.push(node);
            for (const neighbor of (this.adjacency.get(node) ?? new Set())) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                }
                else if (inStack.has(neighbor)) {
                    const cycleStart = stack.indexOf(neighbor);
                    if (cycleStart !== -1) {
                        cycles.push(stack.slice(cycleStart));
                    }
                }
            }
            stack.pop();
            inStack.delete(node);
        };
        for (const node of this.adjacency.keys()) {
            if (!visited.has(node)) {
                dfs(node);
            }
        }
        return cycles;
    }
    hasCircularDependency(symbolId) {
        const visited = new Set();
        const inStack = new Set();
        const dfs = (node) => {
            visited.add(node);
            inStack.add(node);
            for (const neighbor of (this.adjacency.get(node) ?? new Set())) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor))
                        return true;
                }
                else if (inStack.has(neighbor)) {
                    return true;
                }
            }
            inStack.delete(node);
            return false;
        };
        return dfs(symbolId);
    }
    getEdgeKind(fromId, toId) {
        return this.edgeKinds.get(this.edgeKey(fromId, toId));
    }
    getAllEdges() {
        const edges = [];
        for (const [fromId, targets] of this.adjacency.entries()) {
            for (const toId of targets) {
                edges.push({
                    fromId,
                    toId,
                    kind: this.edgeKinds.get(this.edgeKey(fromId, toId)) ?? 'import',
                });
            }
        }
        return edges;
    }
    getNodeCount() {
        return this.adjacency.size;
    }
    getEdgeCount() {
        let count = 0;
        for (const targets of this.adjacency.values()) {
            count += targets.size;
        }
        return count;
    }
    clear() {
        this.adjacency.clear();
        this.reverseAdjacency.clear();
        this.edgeKinds.clear();
    }
    static fromEdges(edges) {
        const graph = new DependencyGraph();
        graph.addEdges(edges);
        return graph;
    }
    static fromSymbols(symbols) {
        const graph = new DependencyGraph();
        const idSet = new Set(symbols.map(s => s.id));
        for (const sym of symbols) {
            for (const depId of sym.dependencies) {
                if (idSet.has(depId)) {
                    graph.addEdge({ fromId: sym.id, toId: depId, kind: 'import' });
                }
            }
        }
        return graph;
    }
}
exports.DependencyGraph = DependencyGraph;
//# sourceMappingURL=dependency-graph.js.map