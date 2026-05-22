export interface SemanticReplayEvent {
  id: string;
  operationId: string;
  operationType: string;
  transformationId: string;
  affectedArtifacts: string[];  // file paths or symbol ids
  status: 'planned' | 'applied' | 'rolled_back' | 'failed';
  timestamp: number;
  durationMs?: number;
  error?: string;
}
