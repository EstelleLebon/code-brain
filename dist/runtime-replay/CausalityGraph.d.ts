export interface CausalEdge {
    from: string;
    to: string;
    label: string;
}
export interface CausalityGraph {
    nodes: string[];
    edges: CausalEdge[];
}
export declare class CausalityGraphBuilder {
    private nodes;
    private edges;
    addEdge(from: string, to: string, label: string): this;
    build(): CausalityGraph;
    ancestors(nodeId: string): string[];
    descendants(nodeId: string): string[];
}
//# sourceMappingURL=CausalityGraph.d.ts.map