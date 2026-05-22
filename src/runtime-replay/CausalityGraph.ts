export interface CausalEdge {
  from: string;
  to: string;
  label: string;
}

export interface CausalityGraph {
  nodes: string[];
  edges: CausalEdge[];
}

export class CausalityGraphBuilder {
  private nodes = new Set<string>();
  private edges: CausalEdge[] = [];

  addEdge(from: string, to: string, label: string): this {
    this.nodes.add(from);
    this.nodes.add(to);
    this.edges.push({ from, to, label });
    return this;
  }

  build(): CausalityGraph {
    return { nodes: [...this.nodes], edges: [...this.edges] };
  }

  ancestors(nodeId: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
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

  descendants(nodeId: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
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
