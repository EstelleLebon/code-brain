import { RuntimeReplayEvent, makeReplayEventId } from './RuntimeReplayEvent.js';

export interface RuntimeReplayQuery {
  operationId?: string;
  causedRollback?: boolean;
  since?: number;
  outcomeId?: string;
}

export class RuntimeReplayLog {
  private events: RuntimeReplayEvent[] = [];

  record(
    operationId: string,
    runtimeSignals: string[],
    outcomeId: string,
    causedRollback: boolean,
    metadata?: Record<string, unknown>,
  ): RuntimeReplayEvent {
    const event: RuntimeReplayEvent = {
      id: makeReplayEventId(),
      operationId,
      runtimeSignals,
      outcomeId,
      causedRollback,
      timestamp: Date.now(),
      metadata,
    };
    this.events.push(event);
    return event;
  }

  query(q: RuntimeReplayQuery = {}): RuntimeReplayEvent[] {
    return this.events.filter(e => {
      if (q.operationId !== undefined && e.operationId !== q.operationId) return false;
      if (q.causedRollback !== undefined && e.causedRollback !== q.causedRollback) return false;
      if (q.since !== undefined && e.timestamp < q.since) return false;
      if (q.outcomeId !== undefined && e.outcomeId !== q.outcomeId) return false;
      return true;
    });
  }

  forOperation(operationId: string): RuntimeReplayEvent[] {
    return this.query({ operationId });
  }

  rollbacks(): RuntimeReplayEvent[] {
    return this.query({ causedRollback: true });
  }

  all(): RuntimeReplayEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
