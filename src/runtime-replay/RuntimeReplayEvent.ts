export interface RuntimeReplayEvent {
  id: string;
  operationId: string;
  runtimeSignals: string[];
  outcomeId: string;
  causedRollback: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function makeReplayEventId(): string {
  return `rre-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
