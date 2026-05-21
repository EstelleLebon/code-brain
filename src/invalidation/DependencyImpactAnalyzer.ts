import { DependencyGraph } from '../graph/dependency-graph.js';

/**
 * Given a set of changed symbol IDs, finds all downstream dependents using BFS.
 */
export class DependencyImpactAnalyzer {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /** Returns all impacted symbol IDs (including the originals).
   * Follows forward edges (dependencies) to find all symbols reachable from changed symbols.
   * When a file changes, all symbols it depends on transitively may need re-evaluation.
   */
  getImpacted(changedSymbolIds: string[]): string[] {
    const visited = new Set<string>();
    const queue = [...changedSymbolIds];

    for (const id of changedSymbolIds) {
      visited.add(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      // Follow forward edges (what current depends on)
      const deps = this.graph.getDependencies(current, 1);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(visited);
  }
}
