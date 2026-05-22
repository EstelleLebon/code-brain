import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';

export interface WorkingMemorySnapshot {
  sessionId: string;
  activeChunkIds: string[];
  recentSignals: RuntimeSignal[];
  recentOutcomes: ExecutionOutcome[];
  pendingMutationCount: number;
  capturedAt: number;
}

/**
 * Short-lived session memory. Holds in-progress context for the current execution session.
 * TTL-based eviction; not persisted to disk.
 */
export class WorkingMemory {
  private sessionId: string;
  private activeChunkIds: Set<string> = new Set();
  private recentSignals: RuntimeSignal[] = [];
  private recentOutcomes: ExecutionOutcome[] = [];
  private pendingMutationCount = 0;
  private readonly ttlMs: number;
  private readonly maxSignals: number;
  private readonly maxOutcomes: number;
  private lastActivity = Date.now();

  constructor(sessionId: string, ttlMs = 30 * 60 * 1000, maxSignals = 50, maxOutcomes = 20) {
    this.sessionId = sessionId;
    this.ttlMs = ttlMs;
    this.maxSignals = maxSignals;
    this.maxOutcomes = maxOutcomes;
  }

  setActiveChunks(chunkIds: string[]): void {
    this.activeChunkIds = new Set(chunkIds);
    this.touch();
  }

  addSignal(signal: RuntimeSignal): void {
    this.recentSignals.push(signal);
    if (this.recentSignals.length > this.maxSignals) this.recentSignals.shift();
    this.touch();
  }

  addOutcome(outcome: ExecutionOutcome): void {
    this.recentOutcomes.push(outcome);
    if (this.recentOutcomes.length > this.maxOutcomes) this.recentOutcomes.shift();
    this.touch();
  }

  setPendingMutations(count: number): void {
    this.pendingMutationCount = count;
    this.touch();
  }

  isExpired(): boolean {
    return Date.now() - this.lastActivity >= this.ttlMs;
  }

  snapshot(): WorkingMemorySnapshot {
    return {
      sessionId: this.sessionId,
      activeChunkIds: [...this.activeChunkIds],
      recentSignals: [...this.recentSignals],
      recentOutcomes: [...this.recentOutcomes],
      pendingMutationCount: this.pendingMutationCount,
      capturedAt: Date.now(),
    };
  }

  clear(): void {
    this.activeChunkIds.clear();
    this.recentSignals = [];
    this.recentOutcomes = [];
    this.pendingMutationCount = 0;
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }
}
