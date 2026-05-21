import { DependencyGraph } from '../graph/dependency-graph.js';
/**
 * Given a set of changed symbol IDs, finds all downstream dependents using BFS.
 */
export declare class DependencyImpactAnalyzer {
    private graph;
    constructor(graph: DependencyGraph);
    /** Returns all impacted symbol IDs (including the originals).
     * Follows forward edges (dependencies) to find all symbols reachable from changed symbols.
     * When a file changes, all symbols it depends on transitively may need re-evaluation.
     */
    getImpacted(changedSymbolIds: string[]): string[];
}
//# sourceMappingURL=DependencyImpactAnalyzer.d.ts.map