export interface MemorySnapshot {
  workingMemory: unknown;
  episodicMemory: unknown;
  semanticMemory: unknown;
  proceduralMemory: unknown;
}

export interface TrustSnapshot {
  successCount: number;
  failureCount: number;
  chunkReliability: Record<string, { successes: number; failures: number }>;
}

export interface CognitiveSnapshot {
  readonly id: string;
  readonly createdAt: Date;
  readonly executionId: string;
  readonly memory: MemorySnapshot;
  readonly trust: TrustSnapshot;
  readonly metadata: Record<string, unknown>;
}

export interface SnapshotSource {
  getWorkingMemoryState(): unknown;
  getEpisodicMemoryState(): unknown;
  getSemanticMemoryState(): unknown;
  getProceduralMemoryState(): unknown;
  getTrustState(): TrustSnapshot;
}

let _snapSeq = 0;

export class SnapshotManager {
  private _snapshots: Map<string, CognitiveSnapshot> = new Map();

  createSnapshot(executionId: string, source: SnapshotSource, metadata: Record<string, unknown> = {}): CognitiveSnapshot {
    const snap: CognitiveSnapshot = Object.freeze({
      id: `snap-${Date.now()}-${++_snapSeq}`,
      createdAt: new Date(),
      executionId,
      memory: {
        workingMemory: source.getWorkingMemoryState(),
        episodicMemory: source.getEpisodicMemoryState(),
        semanticMemory: source.getSemanticMemoryState(),
        proceduralMemory: source.getProceduralMemoryState(),
      },
      trust: source.getTrustState(),
      metadata,
    });
    this._snapshots.set(snap.id, snap);
    return snap;
  }

  restoreSnapshot(id: string): CognitiveSnapshot | undefined {
    return this._snapshots.get(id);
  }

  latest(): CognitiveSnapshot | undefined {
    let latest: CognitiveSnapshot | undefined;
    for (const snap of this._snapshots.values()) {
      if (!latest || snap.createdAt >= latest.createdAt) latest = snap;
    }
    return latest;
  }

  latestForExecution(executionId: string): CognitiveSnapshot | undefined {
    let latest: CognitiveSnapshot | undefined;
    for (const snap of this._snapshots.values()) {
      if (snap.executionId !== executionId) continue;
      if (!latest || snap.createdAt >= latest.createdAt) latest = snap;
    }
    return latest;
  }

  list(): CognitiveSnapshot[] {
    return [...this._snapshots.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  clear(): void {
    this._snapshots.clear();
  }
}
