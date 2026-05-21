import { SymbolNode, SemanticChunk, Claim, DependencyEdge } from '../types/index.js';
export declare class DB {
    private db;
    constructor(dbPath: string);
    private runMigrations;
    private initialize;
    upsertFile(filePath: string, hash: string): void;
    getFile(filePath: string): {
        path: string;
        hash: string;
        indexed_at: number;
    } | undefined;
    deleteFile(filePath: string): void;
    getAllFiles(): Array<{
        path: string;
        hash: string;
        indexed_at: number;
    }>;
    insertSymbol(sym: SymbolNode): void;
    insertSymbolsBatch(symbols: SymbolNode[]): void;
    getSymbolById(id: string): SymbolNode | undefined;
    getSymbolByName(name: string): SymbolNode[];
    searchSymbolsByName(pattern: string): SymbolNode[];
    getSymbolsByFile(filePath: string): SymbolNode[];
    deleteSymbolsByFile(filePath: string): void;
    getAllSymbols(): SymbolNode[];
    countSymbols(): number;
    private rowToSymbol;
    insertChunk(chunk: SemanticChunk): void;
    insertChunksBatch(chunks: SemanticChunk[]): void;
    getChunkBySymbolId(symbolId: string): SemanticChunk | undefined;
    getAllChunks(): SemanticChunk[];
    deleteChunksBySymbolIds(symbolIds: string[]): void;
    countChunks(): number;
    private rowToChunk;
    insertEmbedding(chunkId: string, vector: Float32Array): void;
    insertEmbeddingsBatch(items: Array<{
        chunkId: string;
        vector: Float32Array;
    }>): void;
    getAllEmbeddings(): Array<{
        chunkId: string;
        vector: Float32Array;
    }>;
    insertEdge(edge: DependencyEdge): void;
    insertEdgesBatch(edges: DependencyEdge[]): void;
    getOutgoingEdges(fromId: string): DependencyEdge[];
    getIncomingEdges(toId: string): DependencyEdge[];
    deleteEdgesBySymbolId(symbolId: string): void;
    deleteEdgesByFile(filePath: string): void;
    getAllEdges(): DependencyEdge[];
    countEdges(): number;
    insertClaim(claim: Claim): void;
    insertClaimsBatch(claims: Claim[]): void;
    getClaimsBySymbolId(symbolId: string): Claim[];
    deleteClaimsBySymbolId(symbolId: string): void;
    countClaims(): number;
    setMeta(key: string, value: string): void;
    getMeta(key: string): string | undefined;
    transaction<T>(fn: () => T): T;
    close(): void;
}
//# sourceMappingURL=db.d.ts.map