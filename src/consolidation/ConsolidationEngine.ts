import type Database from 'better-sqlite3';
import { MemoryCompactor, type CompactionResult } from './MemoryCompactor.js';
import { summarizeCluster, type SemanticSummary } from './SemanticSummarizer.js';
import { computeDecayScore, type DecayInput, type RetrievalDecayScore } from './RetrievalDecay.js';
import type { SemanticChunk } from '../types/index.js';

export interface ConsolidationResult {
  compaction: CompactionResult;
  summaries: SemanticSummary[];
  decayScores: Map<string, RetrievalDecayScore>;
}

/**
 * Orchestrates memory consolidation: compaction, summarization, and decay scoring.
 */
export class ConsolidationEngine {
  private compactor: MemoryCompactor;

  constructor(db: Database.Database) {
    this.compactor = new MemoryCompactor(db);
  }

  /** Run full consolidation cycle. */
  consolidate(options: {
    chunks?: SemanticChunk[];
    decayInputs?: DecayInput[];
    compactOptions?: Parameters<MemoryCompactor['compact']>[0];
  } = {}): ConsolidationResult {
    const compaction = this.compactor.compact(options.compactOptions);

    // Group chunks by symbolId for cluster summarization
    const summaries: SemanticSummary[] = [];
    if (options.chunks && options.chunks.length > 0) {
      const bySymbol = new Map<string, SemanticChunk[]>();
      for (const c of options.chunks) {
        if (!bySymbol.has(c.symbolId)) bySymbol.set(c.symbolId, []);
        bySymbol.get(c.symbolId)!.push(c);
      }
      for (const cluster of bySymbol.values()) {
        if (cluster.length > 1) {
          summaries.push(summarizeCluster(cluster));
        }
      }
    }

    const decayScores = new Map<string, RetrievalDecayScore>();
    if (options.decayInputs) {
      for (const input of options.decayInputs) {
        decayScores.set(input.chunk.id, computeDecayScore(input));
      }
    }

    return { compaction, summaries, decayScores };
  }
}
