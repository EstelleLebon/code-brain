export interface ExecutionNode {
    id: string;
    goalId: string;
    operationId?: string;
    label: string;
    estimatedRisk: number;
    cognitiveMode: string;
}
export interface ExecutionEdge {
    from: string;
    to: string;
    type: 'depends_on' | 'rollback_trigger';
}
export declare class ExecutionGraph {
    private nodes;
    private edges;
    addNode(node: ExecutionNode): void;
    addEdge(edge: ExecutionEdge): void;
    getNodes(): ExecutionNode[];
    getEdges(): ExecutionEdge[];
    validateDAG(): boolean;
    topologicalSort(): ExecutionNode[];
    ancestors(nodeId: string): ExecutionNode[];
    descendants(nodeId: string): ExecutionNode[];
    criticalPath(): ExecutionNode[];
    rollbackDependencies(nodeId: string): ExecutionNode[];
}
//# sourceMappingURL=ExecutionGraph.d.ts.map