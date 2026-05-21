import { InvalidationResult } from '../invalidation/InvalidationEngine.js';
import { SessionManager } from '../session/SessionContext.js';
import { Contradiction } from '../contradictions/types.js';
import { SymbolNode, SemanticChunk, Claim, DependencyEdge, IndexStats, CodeBrainConfig, RetrievalResult } from '../types/index.js';
export declare class CodeBrain {
    private db;
    private embedder;
    private graph;
    private claimsEngine;
    private indexer;
    private retrieval;
    private watcher;
    private telemetry;
    private invalidationEngine;
    private sessionManager;
    private contradictionDetector;
    constructor(config?: CodeBrainConfig);
    private loadGraphFromDB;
    indexRepository(repoPath: string): Promise<IndexStats>;
    updateFile(filePath: string): Promise<void>;
    findRelevant(query: string, limit?: number): RetrievalResult[];
    getContext(task: string): {
        symbols: SymbolNode[];
        chunks: SemanticChunk[];
        claims: Claim[];
    };
    getSymbol(name: string): SymbolNode | null;
    getGraph(): {
        nodes: SymbolNode[];
        edges: DependencyEdge[];
    };
    startWatching(repoPath: string, glob?: string): void;
    stopWatching(): void;
    getStats(): IndexStats;
    getSymbolById(id: string): SymbolNode | null;
    getDependencies(id: string, depth?: number): SymbolNode[];
    getDependents(id: string, depth?: number): SymbolNode[];
    getClaims(symbolId: string): Claim[];
    onWatchEvent(handler: (data: {
        event: string;
        filePath: string;
        timestamp: number;
        changed: boolean;
    }) => void): void;
    invalidate(filePath: string): Promise<InvalidationResult>;
    getSessionManager(): SessionManager;
    createSession(): string;
    detectContradictions(symbolId?: string): Contradiction[];
    close(): void;
}
//# sourceMappingURL=api.d.ts.map