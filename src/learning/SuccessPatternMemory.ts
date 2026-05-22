export interface SuccessPattern {
  id: string;
  operationType: string;
  structuralContext: string[];
  successCount: number;
  averageRisk: number;
  lastSeen: number;
}

function makeId(): string {
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  return a.filter(x => setB.has(x)).length / Math.max(a.length, b.length);
}

/**
 * Symmetric counterpart to FailureMemory: tracks successful transformations
 * to reinforce stable, low-risk operation patterns.
 */
export class SuccessPatternMemory {
  private patterns: SuccessPattern[] = [];

  record(operationType: string, structuralContext: string[], observedRisk: number): SuccessPattern {
    const existing = this.findSimilar(operationType, structuralContext);
    if (existing) {
      existing.successCount++;
      existing.lastSeen = Date.now();
      existing.averageRisk = (existing.averageRisk * (existing.successCount - 1) + observedRisk) / existing.successCount;
      return existing;
    }
    const pattern: SuccessPattern = {
      id: makeId(),
      operationType,
      structuralContext: [...structuralContext],
      successCount: 1,
      averageRisk: observedRisk,
      lastSeen: Date.now(),
    };
    this.patterns.push(pattern);
    return pattern;
  }

  findSimilar(operationType: string, context: string[], threshold = 0.6): SuccessPattern | undefined {
    return this.patterns.find(p =>
      p.operationType === operationType && overlapScore(p.structuralContext, context) >= threshold,
    );
  }

  getAll(): SuccessPattern[] { return [...this.patterns]; }

  topBySuccessRate(limit = 10): SuccessPattern[] {
    return [...this.patterns]
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, limit);
  }
}
