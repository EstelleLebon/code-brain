import type { CognitiveMode } from '../cognitive-modes/CognitiveMode.js';

export interface ProceduralPattern {
  id: string;
  name: string;
  mode: CognitiveMode;
  operationSequence: string[];   // operation types in order
  successRate: number;
  executionCount: number;
  avgDurationMs: number;
  lastUsed: number;
}

function makeId(): string {
  return `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Stores effective procedural strategies: which operation sequences work in which modes.
 */
export class ProceduralMemory {
  private patterns: ProceduralPattern[] = [];

  record(
    name: string,
    mode: CognitiveMode,
    operationSequence: string[],
    success: boolean,
    durationMs: number,
  ): ProceduralPattern {
    const existing = this.find(name, mode);
    if (existing) {
      const prevSuccesses = Math.round(existing.successRate * existing.executionCount);
      existing.executionCount++;
      existing.successRate = (prevSuccesses + (success ? 1 : 0)) / existing.executionCount;
      existing.avgDurationMs = (existing.avgDurationMs * (existing.executionCount - 1) + durationMs) / existing.executionCount;
      existing.lastUsed = Date.now();
      return existing;
    }

    const pattern: ProceduralPattern = {
      id: makeId(),
      name,
      mode,
      operationSequence,
      successRate: success ? 1 : 0,
      executionCount: 1,
      avgDurationMs: durationMs,
      lastUsed: Date.now(),
    };
    this.patterns.push(pattern);
    return pattern;
  }

  find(name: string, mode: CognitiveMode): ProceduralPattern | undefined {
    return this.patterns.find(p => p.name === name && p.mode === mode);
  }

  bestForMode(mode: CognitiveMode, limit = 5): ProceduralPattern[] {
    return this.patterns
      .filter(p => p.mode === mode && p.executionCount >= 2)
      .sort((a, b) => b.successRate - a.successRate || b.executionCount - a.executionCount)
      .slice(0, limit);
  }

  all(): ProceduralPattern[] {
    return [...this.patterns];
  }
}
