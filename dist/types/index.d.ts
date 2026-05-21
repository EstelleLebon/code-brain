import { z } from 'zod';
export declare enum TruthLevel {
    STRUCTURAL = 0,// AST facts
    DERIVED = 1,// import graph, parsed claims
    SEMANTIC = 2,// future LLM summaries
    HEURISTIC = 3
}
export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method' | 'property' | 'enum' | 'namespace' | 'export';
export interface SymbolNode {
    id: string;
    name: string;
    kind: SymbolKind;
    filePath: string;
    startLine: number;
    endLine: number;
    signature?: string;
    exported: boolean;
    dependencies: string[];
    hash: string;
    createdAt: number;
    updatedAt: number;
}
export interface SemanticChunk {
    id: string;
    symbolId: string;
    content: string;
    summary?: string;
    embedding?: number[];
    hash: string;
    truthLevel: TruthLevel;
}
export interface Claim {
    id: string;
    symbolId: string;
    claim: string;
    confidence: number;
    sourceHash: string;
    truthLevel: TruthLevel;
}
export type RetrievalReason = 'semantic_similarity' | 'dependency_expansion' | 'symbol_match' | 'session_bias' | 'cache_hit';
export interface RetrievalTrace {
    source: string;
    retrievalReason: RetrievalReason;
    dependencyPath?: string[];
    confidence: number;
    truthLevel: TruthLevel;
}
export interface RetrievalResult {
    chunk: SemanticChunk;
    score: number;
    trace: RetrievalTrace;
}
export interface ContextEntropyMetrics {
    redundancyScore: number;
    overlapScore: number;
    diversityScore: number;
    signalNoiseRatio: number;
    chunkCount: number;
    uniqueFileCount: number;
}
export interface DependencyEdge {
    fromId: string;
    toId: string;
    kind: 'import' | 'call' | 'extends' | 'implements' | 'typeref' | 'composition';
}
export interface IndexStats {
    symbolCount: number;
    chunkCount: number;
    edgeCount: number;
    claimCount: number;
    lastIndexed: number;
    durationMs: number;
}
export interface ParsedFile {
    filePath: string;
    hash: string;
    symbols: RawSymbol[];
    imports: RawImport[];
}
export interface RawSymbol {
    name: string;
    kind: SymbolKind;
    startLine: number;
    endLine: number;
    signature?: string;
    exported: boolean;
    sourceText: string;
    children?: RawSymbol[];
}
export interface RawImport {
    source: string;
    names: string[];
    isDefault: boolean;
    isNamespace: boolean;
}
export interface TelemetryEvent {
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    event: string;
    data?: Record<string, unknown>;
}
export declare const SymbolKindSchema: z.ZodEnum<["function", "class", "interface", "type", "variable", "method", "property", "enum", "namespace", "export"]>;
export declare const SymbolNodeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    kind: z.ZodEnum<["function", "class", "interface", "type", "variable", "method", "property", "enum", "namespace", "export"]>;
    filePath: z.ZodString;
    startLine: z.ZodNumber;
    endLine: z.ZodNumber;
    signature: z.ZodOptional<z.ZodString>;
    exported: z.ZodBoolean;
    dependencies: z.ZodArray<z.ZodString, "many">;
    hash: z.ZodString;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    kind: "function" | "class" | "interface" | "type" | "variable" | "method" | "property" | "enum" | "namespace" | "export";
    filePath: string;
    startLine: number;
    endLine: number;
    exported: boolean;
    dependencies: string[];
    hash: string;
    createdAt: number;
    updatedAt: number;
    signature?: string | undefined;
}, {
    id: string;
    name: string;
    kind: "function" | "class" | "interface" | "type" | "variable" | "method" | "property" | "enum" | "namespace" | "export";
    filePath: string;
    startLine: number;
    endLine: number;
    exported: boolean;
    dependencies: string[];
    hash: string;
    createdAt: number;
    updatedAt: number;
    signature?: string | undefined;
}>;
export declare const CodeBrainConfigSchema: z.ZodObject<{
    dbPath: z.ZodOptional<z.ZodString>;
    watchGlob: z.ZodOptional<z.ZodString>;
    embeddingDim: z.ZodOptional<z.ZodNumber>;
    maxVocabSize: z.ZodOptional<z.ZodNumber>;
    telemetry: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dbPath?: string | undefined;
    watchGlob?: string | undefined;
    embeddingDim?: number | undefined;
    maxVocabSize?: number | undefined;
    telemetry?: boolean | undefined;
}, {
    dbPath?: string | undefined;
    watchGlob?: string | undefined;
    embeddingDim?: number | undefined;
    maxVocabSize?: number | undefined;
    telemetry?: boolean | undefined;
}>;
export type CodeBrainConfig = z.infer<typeof CodeBrainConfigSchema>;
//# sourceMappingURL=index.d.ts.map