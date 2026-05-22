import { FailurePattern } from './FailurePattern.js';

function makeId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const common = a.filter(x => setB.has(x)).length;
  return common / Math.max(a.length, b.length);
}

export class FailureMemory {
  private patterns: FailurePattern[] = [];

  record(
    operationType: string,
    structuralContext: string[],
    runtimeConsequences: string[],
    severity: number,
  ): FailurePattern {
    const existing = this.findSimilar(operationType, structuralContext);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = Date.now();
      for (const c of runtimeConsequences) {
        if (!existing.runtimeConsequences.includes(c)) existing.runtimeConsequences.push(c);
      }
      existing.severity = Math.max(existing.severity, severity);
      return existing;
    }

    const pattern: FailurePattern = {
      id: makeId(),
      operationType,
      structuralContext,
      runtimeConsequences,
      frequency: 1,
      severity,
      lastSeen: Date.now(),
    };
    this.patterns.push(pattern);
    return pattern;
  }

  findSimilar(
    operationType: string,
    structuralContext: string[],
    threshold = 0.6,
  ): FailurePattern | undefined {
    return this.patterns.find(
      p =>
        p.operationType === operationType &&
        overlapScore(p.structuralContext, structuralContext) >= threshold,
    );
  }

  search(operationType?: string, contextKeyword?: string): FailurePattern[] {
    return this.patterns.filter(p => {
      if (operationType && p.operationType !== operationType) return false;
      if (contextKeyword) {
        const haystack = [...p.structuralContext, ...p.runtimeConsequences].join(' ').toLowerCase();
        if (!haystack.includes(contextKeyword.toLowerCase())) return false;
      }
      return true;
    });
  }

  topBySeverity(limit = 5): FailurePattern[] {
    return [...this.patterns]
      .sort((a, b) => b.severity - a.severity || b.frequency - a.frequency)
      .slice(0, limit);
  }

  all(): FailurePattern[] {
    return [...this.patterns];
  }

  clear(): void {
    this.patterns = [];
  }
}
