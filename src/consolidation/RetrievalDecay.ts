import type { SemanticChunk } from '../types/index.js';

export interface RetrievalDecayScore {
  semanticRelevance: number;
  retrievalFrequency: number;
  recency: number;
  contradictionPenalty: number;
  runtimeReliability: number;
  finalScore: number;
}

export interface DecayInput {
  chunk: SemanticChunk;
  /** Access count across all sessions */
  accessCount: number;
  /** Last accessed timestamp (ms) */
  lastAccessedAt: number;
  /** Whether this chunk is involved in a contradiction */
  hasContradiction?: boolean;
  /** Whether this chunk was stale at last retrieval */
  wasStale?: boolean;
  /** 0-1: fraction of runtime executions that succeeded when this chunk was used */
  runtimeSuccessRate?: number;
}

const NOW_FALLBACK = Date.now();
/** Half-life: 7 days in ms */
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

function recencyScore(lastAccessedAt: number, now = NOW_FALLBACK): number {
  const age = Math.max(0, now - lastAccessedAt);
  return Math.exp(-Math.LN2 * age / HALF_LIFE_MS);
}

export function computeDecayScore(input: DecayInput, now = Date.now()): RetrievalDecayScore {
  const semanticRelevance = Math.min(1, (input.chunk.embedding?.length ?? 0) > 0 ? 0.8 : 0.5);
  const retrievalFrequency = Math.min(1, input.accessCount / 10);
  const recency = recencyScore(input.lastAccessedAt, now);
  const contradictionPenalty = input.hasContradiction ? 0.4 : (input.wasStale ? 0.2 : 0);
  const runtimeReliability = input.runtimeSuccessRate ?? 0.5;

  const raw =
    0.25 * semanticRelevance +
    0.20 * retrievalFrequency +
    0.25 * recency +
    0.15 * runtimeReliability -
    contradictionPenalty;

  const finalScore = Math.max(0, Math.min(1, raw));

  return { semanticRelevance, retrievalFrequency, recency, contradictionPenalty, runtimeReliability, finalScore };
}
