import { CognitiveEvent, CognitiveEventType, makeEventId } from './CognitiveEvent.js';

export interface EventFilter {
  executionId?: string;
  eventTypes?: CognitiveEventType[];
  since?: Date;
  until?: Date;
  correlationId?: string;
}

export interface EventStoreSnapshot {
  readonly id: string;
  readonly createdAt: Date;
  readonly eventCount: number;
  readonly events: readonly CognitiveEvent[];
}

export class EventStore {
  private _events: CognitiveEvent[] = [];
  private _snapshots: Map<string, EventStoreSnapshot> = new Map();

  append(event: CognitiveEvent): void {
    this._events.push(Object.freeze({ ...event }));
  }

  appendBatch(events: readonly CognitiveEvent[]): void {
    for (const e of events) this.append(e);
  }

  stream(executionId: string): readonly CognitiveEvent[] {
    return this._events.filter(e => e.executionId === executionId);
  }

  query(filter: EventFilter): readonly CognitiveEvent[] {
    return this._events.filter(e => {
      if (filter.executionId && e.executionId !== filter.executionId) return false;
      if (filter.eventTypes && !filter.eventTypes.includes(e.eventType)) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      if (filter.until && e.timestamp > filter.until) return false;
      if (filter.correlationId && e.correlationId !== filter.correlationId) return false;
      return true;
    });
  }

  since(timestamp: Date): readonly CognitiveEvent[] {
    return this._events.filter(e => e.timestamp >= timestamp);
  }

  all(): readonly CognitiveEvent[] {
    return [...this._events];
  }

  snapshot(): EventStoreSnapshot {
    const snap: EventStoreSnapshot = Object.freeze({
      id: makeEventId(),
      createdAt: new Date(),
      eventCount: this._events.length,
      events: Object.freeze([...this._events]),
    });
    this._snapshots.set(snap.id, snap);
    return snap;
  }

  getSnapshot(id: string): EventStoreSnapshot | undefined {
    return this._snapshots.get(id);
  }

  listSnapshots(): EventStoreSnapshot[] {
    return [...this._snapshots.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  clear(): void {
    this._events = [];
  }

  get size(): number {
    return this._events.length;
  }
}
