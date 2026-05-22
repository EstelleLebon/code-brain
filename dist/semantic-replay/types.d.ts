export interface SemanticReplayEvent {
    id: string;
    operationId: string;
    operationType: string;
    transformationId: string;
    affectedArtifacts: string[];
    status: 'planned' | 'applied' | 'rolled_back' | 'failed';
    timestamp: number;
    durationMs?: number;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map