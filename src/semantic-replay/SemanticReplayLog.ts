import { SemanticReplayEvent } from './types.js';

export interface SemanticReplayFilter {
  operationType?: string;
  transformationId?: string;
  status?: SemanticReplayEvent['status'];
  since?: number;
}

export class SemanticReplayLog {
  private events: SemanticReplayEvent[] = [];

  record(event: Omit<SemanticReplayEvent, 'id' | 'timestamp'>): SemanticReplayEvent {
    const full: SemanticReplayEvent = {
      ...event,
      id: `sre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    this.events.push(full);
    return full;
  }

  query(filter: SemanticReplayFilter = {}): SemanticReplayEvent[] {
    return this.events.filter(e => {
      if (filter.operationType && e.operationType !== filter.operationType) return false;
      if (filter.transformationId && e.transformationId !== filter.transformationId) return false;
      if (filter.status && e.status !== filter.status) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  getByTransformation(transformationId: string): SemanticReplayEvent[] {
    return this.query({ transformationId });
  }

  canReplay(transformationId: string): boolean {
    const events = this.getByTransformation(transformationId);
    return events.length > 0 && events.every(e => e.status === 'applied');
  }

  clear(): void {
    this.events = [];
  }

  get size(): number {
    return this.events.length;
  }
}
