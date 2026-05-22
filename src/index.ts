// Main entry point and public API exports

export { CodeBrain } from './api/api.js';
export type {
  SymbolNode,
  SymbolKind,
  SemanticChunk,
  Claim,
  DependencyEdge,
  IndexStats,
  ParsedFile,
  RawSymbol,
  RawImport,
  CodeBrainConfig,
  RetrievalResult,
  RetrievalTrace,
  RetrievalReason,
  ContextEntropyMetrics,
} from './types/index.js';
export { TruthLevel } from './types/index.js';

export { DB } from './persistence/db.js';
export { Embedder } from './embeddings/embedder.js';
export { DependencyGraph } from './graph/dependency-graph.js';
export { ClaimsEngine } from './claims/claims-engine.js';
export { Indexer } from './indexer/indexer.js';
export { Retrieval } from './retrieval/retrieval.js';
export { Watcher } from './watcher/watcher.js';
export { Telemetry } from './telemetry/telemetry.js';
export { parseFile, parseSource, isSupportedFile } from './parser/ast.js';
export { extractSymbols, extractEdges, makeSymbolId, makeContentHash } from './parser/extractor.js';
export { chunkSymbol, chunkSymbols } from './chunks/chunker.js';
export { SessionManager } from './session/SessionContext.js';
export type { SessionContext, SessionEntry } from './session/SessionContext.js';
export { applySessionBias } from './session/SessionBias.js';
export { InvalidationEngine } from './invalidation/InvalidationEngine.js';
export type { InvalidationEvent, InvalidationResult } from './invalidation/InvalidationEngine.js';
export { ContradictionDetector } from './contradictions/ContradictionDetector.js';
export type { Contradiction, ContradictionReport, ContradictionKind, ContradictionSeverity } from './contradictions/types.js';
export { computeEntropyMetrics } from './retrieval/entropy.js';
export { TransactionCoordinator, CognitiveTransaction, RollbackManager } from './transactions/index.js';
export type { TransactionResult, TransactionOperation, RollbackRecord } from './transactions/index.js';
export { ReplayLog } from './replay/index.js';
export type { CognitiveReplayEvent, ReplayEventType } from './replay/index.js';
export { RetrievalValidator } from './retrieval/validation/index.js';
export type { RetrievalValidationResult } from './retrieval/validation/index.js';
export { SemanticIR } from './semantic-ir/index.js';
export type { SemanticOperation, SemanticTransformation, SemanticOperationType } from './semantic-ir/index.js';

// If run directly (node dist/index.js), print help
if (require.main === module) {
  console.log(`
Code Brain v1.0.0 — Semantic Runtime Core

Usage:
  const { CodeBrain } = require('code-brain');
  const brain = new CodeBrain({ dbPath: './brain.db' });
  await brain.indexRepository('/path/to/repo');
  const results = brain.findRelevant('authentication middleware');

See examples/index-repo.js for a full example.
  `);
}
