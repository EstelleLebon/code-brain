import { SymbolNode, SemanticChunk, RetrievalResult } from '../types/index.js';
import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { SessionManager } from '../session/SessionContext.js';
export interface RetrievalOptions {
    sessionId?: string;
}
export declare class Retrieval {
    private db;
    private embedder;
    private graph;
    private telemetry;
    private sessionManager;
    private validator;
    constructor(db: DB, embedder: Embedder, graph: DependencyGraph, telemetry: Telemetry, sessionManager?: SessionManager);
    findRelevant(query: string, limit?: number, options?: RetrievalOptions): RetrievalResult[];
    getSymbol(name: string): SymbolNode | null;
    getSymbolById(id: string): SymbolNode | null;
    getDependencies(id: string, depth?: number): SymbolNode[];
    getDependents(id: string, depth?: number): SymbolNode[];
    queryContext(task: string, options?: RetrievalOptions): {
        symbols: SymbolNode[];
        chunks: SemanticChunk[];
        expandedIds: Set<string>;
        results: RetrievalResult[];
    };
    getSessionManager(): SessionManager;
    private getChunkById;
    refreshGraph(): void;
}
//# sourceMappingURL=retrieval.d.ts.map