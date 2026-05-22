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
export declare function summarizeCluster(chunks: SemanticChunk[]): SemanticSummary;
//# sourceMappingURL=SemanticSummarizer.d.ts.map