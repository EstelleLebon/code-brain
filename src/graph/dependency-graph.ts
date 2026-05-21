import { SymbolNode, DependencyEdge } from '../types/index.js';

export class DependencyGraph {
  private adjacency: Map<string, Set<string>> = new Map();
  private reverseAdjacency: Map<string, Set<string>> = new Map();
  private edgeKinds: Map<string, DependencyEdge['kind']> = new Map();

  private edgeKey(fromId: string, toId: string): string {
    return `${fromId}→${toId}`;
  }

  addEdge(edge: DependencyEdge): void {
    if (!this.adjacency.has(edge.fromId)) this.adjacency.set(edge.fromId, new Set());
    if (!this.reverseAdjacency.has(edge.toId)) this.reverseAdjacency.set(edge.toId, new Set());

    this.adjacency.get(edge.fromId)!.add(edge.toId);
    this.reverseAdjacency.get(edge.toId)!.add(edge.fromId);
    this.edgeKinds.set(this.edgeKey(edge.fromId, edge.toId), edge.kind);
  }

  addEdges(edges: DependencyEdge[]): void {
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  removeEdgesFrom(symbolId: string): void {
    const targets = this.adjacency.get(symbolId);
    if (targets) {
      for (const toId of targets) {
        this.reverseAdjacency.get(toId)?.delete(symbolId);
        this.edgeKinds.delete(this.edgeKey(symbolId, toId));
      }
      this.adjacency.delete(symbolId);
    }
  }

  getDependencies(symbolId: string, depth = 1): string[] {
    if (depth <= 0) return [];
    const direct = Array.from(this.adjacency.get(symbolId) ?? []);
    if (depth === 1) return direct;

    const visited = new Set<string>([symbolId]);
    const queue = [...direct];
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push(current);
      if (visited.size < depth + 1) {
        const next = Array.from(this.adjacency.get(current) ?? []);
        queue.push(...next.filter(n => !visited.has(n)));
      }
    }

    return result;
  }

  getDependents(symbolId: string, depth = 1): string[] {
    if (depth <= 0) return [];
    const direct = Array.from(this.reverseAdjacency.get(symbolId) ?? []);
    if (depth === 1) return direct;

    const visited = new Set<string>([symbolId]);
    const queue = [...direct];
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      result.push(current);
      const next = Array.from(this.reverseAdjacency.get(current) ?? []);
      queue.push(...next.filter(n => !visited.has(n)));
    }

    return result;
  }

  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stack: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      inStack.add(node);
      stack.push(node);

      for (const neighbor of (this.adjacency.get(node) ?? new Set())) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (inStack.has(neighbor)) {
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

  hasCircularDependency(symbolId: string): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      inStack.add(node);

      for (const neighbor of (this.adjacency.get(node) ?? new Set())) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true;
        }
      }

      inStack.delete(node);
      return false;
    };

    return dfs(symbolId);
  }

  getEdgeKind(fromId: string, toId: string): DependencyEdge['kind'] | undefined {
    return this.edgeKinds.get(this.edgeKey(fromId, toId));
  }

  getAllEdges(): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
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

  getNodeCount(): number {
    return this.adjacency.size;
  }

  getEdgeCount(): number {
    let count = 0;
    for (const targets of this.adjacency.values()) {
      count += targets.size;
    }
    return count;
  }

  clear(): void {
    this.adjacency.clear();
    this.reverseAdjacency.clear();
    this.edgeKinds.clear();
  }

  static fromEdges(edges: DependencyEdge[]): DependencyGraph {
    const graph = new DependencyGraph();
    graph.addEdges(edges);
    return graph;
  }

  static fromSymbols(symbols: SymbolNode[]): DependencyGraph {
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
