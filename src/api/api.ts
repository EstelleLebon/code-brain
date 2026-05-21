import path from 'path';
import os from 'os';
import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { ClaimsEngine } from '../claims/claims-engine.js';
import { Indexer } from '../indexer/indexer.js';
import { Retrieval } from '../retrieval/retrieval.js';
import { Watcher } from '../watcher/watcher.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { InvalidationEngine, InvalidationResult } from '../invalidation/InvalidationEngine.js';
import { SessionManager } from '../session/SessionContext.js';
import { ContradictionDetector } from '../contradictions/ContradictionDetector.js';
import { Contradiction } from '../contradictions/types.js';
import {
  SymbolNode, SemanticChunk, Claim, DependencyEdge, IndexStats, CodeBrainConfig,
  RetrievalResult
} from '../types/index.js';

export class CodeBrain {
  private db: DB;
  private embedder: Embedder;
  private graph: DependencyGraph;
  private claimsEngine: ClaimsEngine;
  private indexer: Indexer;
  private retrieval: Retrieval;
  private watcher: Watcher;
  private telemetry: Telemetry;
  private invalidationEngine: InvalidationEngine;
  private sessionManager: SessionManager;
  private contradictionDetector: ContradictionDetector;

  constructor(config: CodeBrainConfig = {}) {
    const dbPath = config.dbPath ?? path.join(os.homedir(), '.code-brain', 'index.db');
    const telemetryEnabled = config.telemetry !== false;

    this.telemetry = new Telemetry(telemetryEnabled);
    this.db = new DB(dbPath);
    this.graph = new DependencyGraph();
    this.embedder = new Embedder(this.db, this.telemetry, config.maxVocabSize ?? 512);
    this.claimsEngine = new ClaimsEngine(this.db, this.graph);
    this.indexer = new Indexer(
      this.db,
      this.embedder,
      this.claimsEngine,
      this.graph,
      this.telemetry
    );
    this.sessionManager = new SessionManager();
    this.retrieval = new Retrieval(this.db, this.embedder, this.graph, this.telemetry, this.sessionManager);
    this.watcher = new Watcher(this.indexer, this.embedder, this.telemetry);
    this.invalidationEngine = new InvalidationEngine(this.db, this.graph, this.telemetry);
    this.contradictionDetector = new ContradictionDetector();

    // Load existing edges into graph
    this.loadGraphFromDB();
  }

  private loadGraphFromDB(): void {
    try {
      const edges = this.db.getAllEdges();
      this.graph.addEdges(edges);
      this.telemetry.log('debug', 'api.graph_loaded', { edgeCount: edges.length });
    } catch {
      // DB might be empty
    }
  }

  async indexRepository(repoPath: string): Promise<IndexStats> {
    const absPath = path.resolve(repoPath);
    return Promise.resolve(this.indexer.indexRepository(absPath));
  }

  async updateFile(filePath: string): Promise<void> {
    const absPath = path.resolve(filePath);
    this.indexer.updateFile(absPath);
    // Refresh retrieval graph after update
    this.retrieval.refreshGraph();
  }

  findRelevant(query: string, limit = 10): RetrievalResult[] {
    return this.retrieval.findRelevant(query, limit);
  }

  getContext(task: string): { symbols: SymbolNode[]; chunks: SemanticChunk[]; claims: Claim[] } {
    const { symbols, chunks } = this.retrieval.queryContext(task);

    // Fetch claims for all symbols
    const claims: Claim[] = [];
    for (const sym of symbols) {
      const symClaims = this.claimsEngine.getClaimsForSymbol(sym.id);
      claims.push(...symClaims);
    }

    return { symbols, chunks, claims };
  }

  getSymbol(name: string): SymbolNode | null {
    return this.retrieval.getSymbol(name);
  }

  getGraph(): { nodes: SymbolNode[]; edges: DependencyEdge[] } {
    const nodes = this.db.getAllSymbols();
    const edges = this.db.getAllEdges();
    return { nodes, edges };
  }

  startWatching(repoPath: string, glob?: string): void {
    const absPath = path.resolve(repoPath);
    this.watcher.start(absPath, glob);
  }

  stopWatching(): void {
    this.watcher.stop();
  }

  getStats(): IndexStats {
    return this.indexer.getStats();
  }

  // Additional useful methods
  getSymbolById(id: string): SymbolNode | null {
    return this.retrieval.getSymbolById(id);
  }

  getDependencies(id: string, depth?: number): SymbolNode[] {
    return this.retrieval.getDependencies(id, depth);
  }

  getDependents(id: string, depth?: number): SymbolNode[] {
    return this.retrieval.getDependents(id, depth);
  }

  getClaims(symbolId: string): Claim[] {
    return this.claimsEngine.getClaimsForSymbol(symbolId);
  }

  onWatchEvent(handler: (data: { event: string; filePath: string; timestamp: number; changed: boolean }) => void): void {
    this.watcher.onEvent(handler);
  }

  async invalidate(filePath: string): Promise<InvalidationResult> {
    const absPath = path.resolve(filePath);
    const symbols = this.db.getSymbolsByFile(absPath);
    const symbolIds = symbols.map(s => s.id);
    return Promise.resolve(this.invalidationEngine.propagate({
      filePath: absPath,
      symbolIds,
      timestamp: Date.now(),
      reason: 'manual',
    }));
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  createSession(): string {
    return this.sessionManager.createSession();
  }

  detectContradictions(symbolId?: string): Contradiction[] {
    let claims: Claim[];
    if (symbolId) {
      claims = this.claimsEngine.getClaimsForSymbol(symbolId);
    } else {
      // Get claims for all symbols
      const symbols = this.db.getAllSymbols();
      claims = symbols.flatMap(s => this.claimsEngine.getClaimsForSymbol(s.id));
    }
    return this.contradictionDetector.detect(claims);
  }

  close(): void {
    this.watcher.stop();
    this.db.close();
  }
}
