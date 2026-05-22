export type ReplayEventType =
  | 'file_changed'
  | 'invalidation_started'
  | 'invalidation_completed'
  | 'recompute_started'
  | 'recompute_completed'
  | 'retrieval_started'
  | 'retrieval_completed'
  | 'contradiction_detected'
  | 'transaction_committed'
  | 'transaction_rolled_back';

export interface CognitiveReplayEvent {
  id: string;
  timestamp: number;
  eventType: ReplayEventType;
  artifactIds: string[];
  transactionId: string;
  metadata?: Record<string, unknown>;
}
