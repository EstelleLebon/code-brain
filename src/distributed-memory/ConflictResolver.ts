import type { ReplicatedMemoryEntry } from './MemoryReplication.js';

export interface SemanticConflict {
  memoryId: string;
  entries: ReplicatedMemoryEntry[];
  conflictType: 'confidence' | 'version' | 'content';
}

export interface ResolutionResult {
  resolved: ReplicatedMemoryEntry;
  strategy: string;
  discarded: ReplicatedMemoryEntry[];
}

export class ConflictResolver {
  resolveSemanticConflict(conflict: SemanticConflict): ResolutionResult {
    const { entries } = conflict;
    if (entries.length === 0) throw new Error('No entries to resolve');
    if (entries.length === 1) return { resolved: entries[0], strategy: 'single', discarded: [] };

    const sorted = [...entries].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.version - a.version;
    });

    return {
      resolved: sorted[0],
      strategy: 'highest_confidence_then_latest_version',
      discarded: sorted.slice(1),
    };
  }

  resolveEpisodicConflict(entries: ReplicatedMemoryEntry[]): ResolutionResult {
    if (entries.length === 0) throw new Error('No entries to resolve');
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    return {
      resolved: sorted[0],
      strategy: 'append_all_keep_latest',
      discarded: [],
    };
  }

  resolveTrustConflict(entries: ReplicatedMemoryEntry[]): ResolutionResult {
    if (entries.length === 0) throw new Error('No entries to resolve');
    const sorted = [...entries].sort((a, b) => a.confidence - b.confidence);
    return {
      resolved: sorted[0],
      strategy: 'minimum_trust_conservative',
      discarded: sorted.slice(1),
    };
  }
}
