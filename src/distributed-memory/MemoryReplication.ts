import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';

export type ReplicationStrategy = 'last_write_wins' | 'highest_confidence' | 'merge' | 'manual';

export interface ReplicatedMemoryEntry {
  memoryId: string;
  content: unknown;
  confidence: number;
  sourceNodeId: string;
  version: number;
  timestamp: number;
}

export interface ReplicationConflict {
  memoryId: string;
  entries: ReplicatedMemoryEntry[];
  detectedAt: number;
}

export class MemoryReplication {
  private store: Map<string, ReplicatedMemoryEntry[]> = new Map();
  private conflicts: ReplicationConflict[] = [];
  private clock = 0;

  constructor(
    private bus: DistributedEventBus,
    private strategy: ReplicationStrategy = 'highest_confidence'
  ) {}

  replicate(entry: ReplicatedMemoryEntry, targetNodeId: string): void {
    const existing = this.store.get(entry.memoryId) ?? [];
    const conflict = existing.find(e => e.sourceNodeId !== entry.sourceNodeId && e.version === entry.version);

    if (conflict) {
      this.conflicts.push({
        memoryId: entry.memoryId,
        entries: [conflict, entry],
        detectedAt: this.clock++,
      });
      this.bus.publish(
        { type: 'conflict_detected', memoryId: entry.memoryId, nodeIds: [conflict.sourceNodeId, entry.sourceNodeId] },
        entry.sourceNodeId,
        targetNodeId
      );
    }

    existing.push(entry);
    this.store.set(entry.memoryId, existing);
    this.bus.publish(
      { type: 'memory_replicated', sourceNodeId: entry.sourceNodeId, targetNodeId, memoryId: entry.memoryId },
      entry.sourceNodeId,
      targetNodeId
    );
  }

  resolve(memoryId: string): ReplicatedMemoryEntry | undefined {
    const entries = this.store.get(memoryId);
    if (!entries || entries.length === 0) return undefined;

    switch (this.strategy) {
      case 'last_write_wins':
        return entries.reduce((latest, e) => e.timestamp > latest.timestamp ? e : latest);
      case 'highest_confidence':
        return entries.reduce((best, e) => e.confidence > best.confidence ? e : best);
      case 'merge':
        return entries.reduce((latest, e) => e.version > latest.version ? e : latest);
      case 'manual':
        return entries[0];
    }
  }

  getConflicts(): ReplicationConflict[] { return [...this.conflicts]; }
  getStore(): Map<string, ReplicatedMemoryEntry[]> { return new Map(this.store); }

  syncEpisodic(events: unknown[], sourceNodeId: string, targetNodeId: string): void {
    const entry: ReplicatedMemoryEntry = {
      memoryId: `episodic-${sourceNodeId}-${this.clock}`,
      content: events,
      confidence: 1.0,
      sourceNodeId,
      version: this.clock++,
      timestamp: this.clock,
    };
    this.replicate(entry, targetNodeId);
  }
}
