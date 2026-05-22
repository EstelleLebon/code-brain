import type { SemanticChunk } from '../types/index.js';
import { TruthLevel } from '../types/index.js';

export interface SemanticSummary {
  id: string;
  symbolIds: string[];
  content: string;
  truthLevel: TruthLevel;
  chunkCount: number;
  createdAt: number;
}

/** Compresses a cluster of semantic chunks into a single dense summary. */
export function summarizeCluster(chunks: SemanticChunk[]): SemanticSummary {
  if (chunks.length === 0) {
    return {
      id: `sum-empty-${Date.now()}`,
      symbolIds: [],
      content: '',
      truthLevel: TruthLevel.DERIVED,
      chunkCount: 0,
      createdAt: Date.now(),
    };
  }

  // Lowest ordinal = highest quality
  const bestTruthLevel = chunks.reduce(
    (best, c) => (c.truthLevel !== undefined && c.truthLevel < best ? c.truthLevel : best),
    TruthLevel.HEURISTIC,
  );

  // Deduplicate and join content lines, stripping duplicates
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const chunk of chunks) {
    for (const line of chunk.content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        lines.push(trimmed);
      }
    }
  }

  return {
    id: `sum-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    symbolIds: [...new Set(chunks.map(c => c.symbolId))],
    content: lines.join('\n'),
    truthLevel: bestTruthLevel,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };
}
