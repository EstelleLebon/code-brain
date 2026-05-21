import { DB } from '../persistence/db.js';
import { Telemetry } from '../telemetry/telemetry.js';
export declare class Embedder {
    private vocabulary;
    private vocabSize;
    private db;
    private telemetry;
    private initialized;
    constructor(db: DB, telemetry: Telemetry, vocabSize?: number);
    private ensureVocabulary;
    private buildVocabulary;
    rebuildVocabulary(): void;
    embed(text: string): Float32Array;
    cosineSimilarity(a: Float32Array, b: Float32Array): number;
    computeAndStore(chunkId: string, text: string): Float32Array;
    computeAndStoreBatch(items: Array<{
        chunkId: string;
        text: string;
    }>): void;
    findSimilar(queryVec: Float32Array, limit: number): Array<{
        chunkId: string;
        similarity: number;
    }>;
}
//# sourceMappingURL=embedder.d.ts.map