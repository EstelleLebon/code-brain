export interface RetrievalReliabilitySignal {
  chunkId: string;
  successRate: number;
  failureRate: number;
  runtimeConfidence: number;
}

interface ChunkStats {
  successes: number;
  failures: number;
  lastSeen: number;
}

export class AdaptiveRetrievalPolicy {
  private stats = new Map<string, ChunkStats>();

  recordSuccess(chunkId: string): void {
    const s = this.getOrCreate(chunkId);
    s.successes++;
    s.lastSeen = Date.now();
  }

  recordFailure(chunkId: string): void {
    const s = this.getOrCreate(chunkId);
    s.failures++;
    s.lastSeen = Date.now();
  }

  getSignal(chunkId: string): RetrievalReliabilitySignal {
    const s = this.stats.get(chunkId);
    if (!s) return { chunkId, successRate: 0.5, failureRate: 0.5, runtimeConfidence: 0.5 };

    const total = s.successes + s.failures;
    const successRate = total === 0 ? 0.5 : s.successes / total;
    const failureRate = total === 0 ? 0.5 : s.failures / total;
    const runtimeConfidence = Math.min(1, total / 10) * successRate;

    return { chunkId, successRate, failureRate, runtimeConfidence };
  }

  // Returns a reliability score (0-1) to boost/penalize retrieval ranking
  reliabilityScore(chunkId: string): number {
    return this.getSignal(chunkId).runtimeConfidence;
  }

  // Rank chunk IDs by reliability (best first)
  rankByReliability(chunkIds: string[]): string[] {
    return [...chunkIds].sort((a, b) => this.reliabilityScore(b) - this.reliabilityScore(a));
  }

  allSignals(): RetrievalReliabilitySignal[] {
    return [...this.stats.keys()].map(id => this.getSignal(id));
  }

  private getOrCreate(chunkId: string): ChunkStats {
    if (!this.stats.has(chunkId)) this.stats.set(chunkId, { successes: 0, failures: 0, lastSeen: Date.now() });
    return this.stats.get(chunkId)!;
  }
}
