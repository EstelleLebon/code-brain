import type Database from 'better-sqlite3';
import { MemoryCompactor, type CompactionResult } from './MemoryCompactor.js';
import { type SemanticSummary } from './SemanticSummarizer.js';
import { type DecayInput, type RetrievalDecayScore } from './RetrievalDecay.js';
import type { SemanticChunk } from '../types/index.js';
export interface ConsolidationResult {
    compaction: CompactionResult;
    summaries: SemanticSummary[];
    decayScores: Map<string, RetrievalDecayScore>;
}
/**
 * Orchestrates memory consolidation: compaction, summarization, and decay scoring.
 */
export declare class ConsolidationEngine {
    private compactor;
    constructor(db: Database.Database);
    /** Run full consolidation cycle. */
    consolidate(options?: {
        chunks?: SemanticChunk[];
        decayInputs?: DecayInput[];
        compactOptions?: Parameters<MemoryCompactor['compact']>[0];
    }): ConsolidationResult;
}
//# sourceMappingURL=ConsolidationEngine.d.ts.map