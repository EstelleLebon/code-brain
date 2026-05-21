import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { ClaimsEngine } from '../claims/claims-engine.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { IndexStats } from '../types/index.js';
export declare class Indexer {
    private db;
    private embedder;
    private claimsEngine;
    private graph;
    private telemetry;
    constructor(db: DB, embedder: Embedder, claimsEngine: ClaimsEngine, graph: DependencyGraph, telemetry: Telemetry);
    indexRepository(repoPath: string): IndexStats;
    indexFile(filePath: string): boolean;
    private resolveInterFileEdges;
    updateFile(filePath: string): boolean;
    getStats(durationMs?: number): IndexStats;
}
//# sourceMappingURL=indexer.d.ts.map