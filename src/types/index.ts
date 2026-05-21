import { z } from 'zod';

export enum TruthLevel {
  STRUCTURAL = 0,   // AST facts
  DERIVED    = 1,   // import graph, parsed claims
  SEMANTIC   = 2,   // future LLM summaries
  HEURISTIC  = 3,   // session heuristics
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'variable'
  | 'method'
  | 'property'
  | 'enum'
  | 'namespace'
  | 'export';

export interface SymbolNode {
  id: string;           // sha256 of filePath+name+kind
  name: string;
  kind: SymbolKind;
  filePath: string;
  startLine: number;
  endLine: number;
  signature?: string;
  exported: boolean;
  dependencies: string[];  // symbol ids
  hash: string;            // sha256 of source text
  createdAt: number;
  updatedAt: number;
}

export interface SemanticChunk {
  id: string;
  symbolId: string;
  content: string;       // raw source of the symbol
  summary?: string;      // structural summary (params, return type, etc.)
  embedding?: number[];  // vector
  hash: string;
  truthLevel: TruthLevel;
}

export interface Claim {
  id: string;
  symbolId: string;
  claim: string;         // e.g. "exports 3 functions", "has circular dependency"
  confidence: number;    // 0-1
  sourceHash: string;
  truthLevel: TruthLevel;
}

export type RetrievalReason =
  | 'semantic_similarity'
  | 'dependency_expansion'
  | 'symbol_match'
  | 'session_bias'
  | 'cache_hit';

export interface RetrievalTrace {
  source: string;             // file path or symbol id
  retrievalReason: RetrievalReason;
  dependencyPath?: string[];  // how we got here via graph
  confidence: number;         // 0-1
  truthLevel: TruthLevel;
}

export interface RetrievalResult {
  chunk: SemanticChunk;
  score: number;
  trace: RetrievalTrace;
}

export interface ContextEntropyMetrics {
  redundancyScore: number;    // 0-1, fraction of near-duplicate chunks
  overlapScore: number;       // 0-1, average token overlap between chunks
  diversityScore: number;     // 0-1, how spread across files the results are
  signalNoiseRatio: number;   // average confidence of top results
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
  source: string;        // module path
  names: string[];       // imported names
  isDefault: boolean;
  isNamespace: boolean;
}

export interface TelemetryEvent {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  data?: Record<string, unknown>;
}

// Zod schemas for validation
export const SymbolKindSchema = z.enum([
  'function', 'class', 'interface', 'type', 'variable',
  'method', 'property', 'enum', 'namespace', 'export'
]);

export const SymbolNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: SymbolKindSchema,
  filePath: z.string(),
  startLine: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative(),
  signature: z.string().optional(),
  exported: z.boolean(),
  dependencies: z.array(z.string()),
  hash: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const CodeBrainConfigSchema = z.object({
  dbPath: z.string().optional(),
  watchGlob: z.string().optional(),
  embeddingDim: z.number().int().positive().optional(),
  maxVocabSize: z.number().int().positive().optional(),
  telemetry: z.boolean().optional(),
});

export type CodeBrainConfig = z.infer<typeof CodeBrainConfigSchema>;
