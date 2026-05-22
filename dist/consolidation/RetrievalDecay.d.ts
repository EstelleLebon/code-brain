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
export declare function computeDecayScore(input: DecayInput, now?: number): RetrievalDecayScore;
//# sourceMappingURL=RetrievalDecay.d.ts.map