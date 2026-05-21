import { SymbolNode, DependencyEdge } from '../types/index.js';
export declare class DependencyGraph {
    private adjacency;
    private reverseAdjacency;
    private edgeKinds;
    private edgeKey;
    addEdge(edge: DependencyEdge): void;
    addEdges(edges: DependencyEdge[]): void;
    removeEdgesFrom(symbolId: string): void;
    getDependencies(symbolId: string, depth?: number): string[];
    getDependents(symbolId: string, depth?: number): string[];
    detectCycles(): string[][];
    hasCircularDependency(symbolId: string): boolean;
    getEdgeKind(fromId: string, toId: string): DependencyEdge['kind'] | undefined;
    getAllEdges(): DependencyEdge[];
    getNodeCount(): number;
    getEdgeCount(): number;
    clear(): void;
    static fromEdges(edges: DependencyEdge[]): DependencyGraph;
    static fromSymbols(symbols: SymbolNode[]): DependencyGraph;
}
//# sourceMappingURL=dependency-graph.d.ts.map