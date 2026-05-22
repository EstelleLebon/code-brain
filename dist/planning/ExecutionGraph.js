"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionGraph = void 0;
class ExecutionGraph {
    nodes = new Map();
    edges = [];
    addNode(node) {
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    getNodes() {
        return Array.from(this.nodes.values());
    }
    getEdges() {
        return [...this.edges];
    }
    validateDAG() {
        const sorted = this.topologicalSort(); // throws on cycle
        return sorted.length === this.nodes.size;
    }
    topologicalSort() {
        const inDegree = new Map();
        const adjList = new Map();
        for (const id of this.nodes.keys()) {
            inDegree.set(id, 0);
            adjList.set(id, []);
        }
        for (const edge of this.edges) {
            if (edge.type === 'depends_on') {
                // "from depends_on to" means "from" must come after "to"
                adjList.get(edge.to).push(edge.from);
                inDegree.set(edge.from, (inDegree.get(edge.from) ?? 0) + 1);
            }
        }
        const queue = [];
        for (const [id, deg] of inDegree) {
            if (deg === 0)
                queue.push(id);
        }
        const result = [];
        while (queue.length > 0) {
            const id = queue.shift();
            const node = this.nodes.get(id);
            if (node)
                result.push(node);
            for (const neighbor of adjList.get(id) ?? []) {
                const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
                inDegree.set(neighbor, newDeg);
                if (newDeg === 0)
                    queue.push(neighbor);
            }
        }
        if (result.length !== this.nodes.size) {
            throw new Error('Cycle detected in ExecutionGraph');
        }
        return result;
    }
    ancestors(nodeId) {
        const result = [];
        const visited = new Set();
        const stack = [nodeId];
        while (stack.length > 0) {
            const id = stack.pop();
            for (const edge of this.edges) {
                if (edge.type === 'depends_on' && edge.from === id && !visited.has(edge.to)) {
                    visited.add(edge.to);
                    const node = this.nodes.get(edge.to);
                    if (node)
                        result.push(node);
                    stack.push(edge.to);
                }
            }
        }
        return result;
    }
    descendants(nodeId) {
        const result = [];
        const visited = new Set();
        const stack = [nodeId];
        while (stack.length > 0) {
            const id = stack.pop();
            for (const edge of this.edges) {
                if (edge.type === 'depends_on' && edge.to === id && !visited.has(edge.from)) {
                    visited.add(edge.from);
                    const node = this.nodes.get(edge.from);
                    if (node)
                        result.push(node);
                    stack.push(edge.from);
                }
            }
        }
        return result;
    }
    criticalPath() {
        // Longest path by sum of estimatedRisk using DP on topological order
        const sorted = this.topologicalSort();
        const dist = new Map();
        const prev = new Map();
        for (const node of sorted) {
            dist.set(node.id, node.estimatedRisk);
            prev.set(node.id, null);
        }
        for (const node of sorted) {
            for (const edge of this.edges) {
                if (edge.type === 'depends_on' && edge.to === node.id) {
                    const neighbor = this.nodes.get(edge.from);
                    if (!neighbor)
                        continue;
                    const newDist = (dist.get(node.id) ?? 0) + neighbor.estimatedRisk;
                    if (newDist > (dist.get(neighbor.id) ?? 0)) {
                        dist.set(neighbor.id, newDist);
                        prev.set(neighbor.id, node.id);
                    }
                }
            }
        }
        // Find max
        let maxId = sorted[0]?.id ?? '';
        let maxDist = 0;
        for (const [id, d] of dist) {
            if (d > maxDist) {
                maxDist = d;
                maxId = id;
            }
        }
        // Trace back
        const path = [];
        let cur = maxId;
        while (cur) {
            const node = this.nodes.get(cur);
            if (node)
                path.unshift(node);
            cur = prev.get(cur) ?? null;
        }
        return path;
    }
    rollbackDependencies(nodeId) {
        const result = [];
        for (const edge of this.edges) {
            if (edge.type === 'rollback_trigger' && edge.from === nodeId) {
                const node = this.nodes.get(edge.to);
                if (node)
                    result.push(node);
            }
        }
        return result;
    }
}
exports.ExecutionGraph = ExecutionGraph;
//# sourceMappingURL=ExecutionGraph.js.map