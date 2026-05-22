import { CognitiveEvent } from './CognitiveEvent.js';
import { EventStore } from './EventStore.js';
import { CognitiveSnapshot, SnapshotManager } from './SnapshotManager.js';

export type EventHandler = (event: CognitiveEvent) => void | Promise<void>;

export interface ReplayResult {
  readonly executionId: string;
  readonly eventsReplayed: number;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly fromSnapshot: boolean;
  readonly snapshotId?: string;
}

export interface DryReplayResult {
  readonly eventsProcessed: number;
  readonly eventTypes: Record<string, number>;
  readonly causalChains: number;
  readonly orphanedEvents: number;
}

export class ReplayEngine {
  private _handlers: EventHandler[] = [];

  constructor(
    private store: EventStore,
    private snapshots: SnapshotManager,
  ) {}

  onEvent(handler: EventHandler): void {
    this._handlers.push(handler);
  }

  async replay(executionId: string): Promise<ReplayResult> {
    const events = this.store.stream(executionId);
    const start = new Date();
    for (const e of events) {
      for (const h of this._handlers) await h(e);
    }
    return {
      executionId,
      eventsReplayed: events.length,
      startedAt: start,
      completedAt: new Date(),
      fromSnapshot: false,
    };
  }

  async replayFrom(snapshotId: string): Promise<ReplayResult> {
    const snap: CognitiveSnapshot | undefined = this.snapshots.restoreSnapshot(snapshotId);
    if (!snap) throw new Error(`Snapshot not found: ${snapshotId}`);

    const events = this.store.stream(snap.executionId).filter(
      e => e.timestamp >= snap.createdAt
    );
    const start = new Date();
    for (const e of events) {
      for (const h of this._handlers) await h(e);
    }
    return {
      executionId: snap.executionId,
      eventsReplayed: events.length,
      startedAt: start,
      completedAt: new Date(),
      fromSnapshot: true,
      snapshotId,
    };
  }

  async dryReplay(events: readonly CognitiveEvent[]): Promise<DryReplayResult> {
    const eventTypes: Record<string, number> = {};
    const causalIds = new Set<string>();
    let causalChains = 0;
    let orphanedEvents = 0;
    const allIds = new Set(events.map(e => e.id));

    for (const e of events) {
      eventTypes[e.eventType] = (eventTypes[e.eventType] ?? 0) + 1;
      if (e.causationId) {
        causalIds.add(e.causationId);
        if (allIds.has(e.causationId)) causalChains++;
        else orphanedEvents++;
      }
    }

    return {
      eventsProcessed: events.length,
      eventTypes,
      causalChains,
      orphanedEvents,
    };
  }
}
