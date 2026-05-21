import { DependencyGraph } from '../graph/dependency-graph.js';
import { DB } from '../persistence/db.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { DependencyImpactAnalyzer } from './DependencyImpactAnalyzer.js';

export interface InvalidationEvent {
  filePath: string;
  symbolIds: string[];
  timestamp: number;
  reason: string;
}

export interface InvalidationResult {
  invalidatedFiles: string[];
  invalidatedSymbols: string[];
  invalidatedClaims: string[];
  invalidatedChunks: string[];
  propagationDepth: number;
  durationMs: number;
}

export class InvalidationEngine {
  private db: DB;
  private graph: DependencyGraph;
  private telemetry: Telemetry;
  private analyzer: DependencyImpactAnalyzer;

  constructor(db: DB, graph: DependencyGraph, telemetry: Telemetry) {
    this.db = db;
    this.graph = graph;
    this.telemetry = telemetry;
    this.analyzer = new DependencyImpactAnalyzer(graph);
  }

  propagate(event: InvalidationEvent): InvalidationResult {
    const start = performance.now();

    this.telemetry.log('info', 'invalidation.start', {
      filePath: event.filePath,
      reason: event.reason,
      symbolCount: event.symbolIds.length,
    });

    // Step 1: Find all symbols in changed file (plus any explicitly provided)
    const fileSymbols = this.db.getSymbolsByFile(event.filePath);
    const fileSymbolIds = fileSymbols.map(s => s.id);
    const seedIds = Array.from(new Set([...event.symbolIds, ...fileSymbolIds]));

    this.telemetry.log('debug', 'invalidation.seeds', { seedIds });

    // Step 2: BFS-expand via dependency graph to find downstream symbols
    const impactedSymbolIds = this.analyzer.getImpacted(seedIds);

    this.telemetry.log('debug', 'invalidation.impacted', {
      impactedCount: impactedSymbolIds.length,
    });

    // Step 3: Compute propagation depth
    const propagationDepth = this.computeDepth(seedIds, impactedSymbolIds);

    // Step 4: Find invalidated claims
    const invalidatedClaims: string[] = [];
    for (const symId of impactedSymbolIds) {
      const claims = this.db.getClaimsBySymbolId(symId);
      for (const claim of claims) {
        invalidatedClaims.push(claim.id);
      }
    }

    this.telemetry.log('debug', 'invalidation.claims', {
      invalidatedClaimsCount: invalidatedClaims.length,
    });

    // Step 5: Find invalidated chunks
    const invalidatedChunks: string[] = [];
    for (const symId of impactedSymbolIds) {
      const chunk = this.db.getChunkBySymbolId(symId);
      if (chunk) {
        invalidatedChunks.push(chunk.id);
      }
    }

    this.telemetry.log('debug', 'invalidation.chunks', {
      invalidatedChunksCount: invalidatedChunks.length,
    });

    // Step 6: Collect unique impacted files
    const impactedFiles = new Set<string>([event.filePath]);
    for (const symId of impactedSymbolIds) {
      const sym = this.db.getSymbolById(symId);
      if (sym) {
        impactedFiles.add(sym.filePath);
      }
    }

    const durationMs = Math.round(performance.now() - start);

    const result: InvalidationResult = {
      invalidatedFiles: Array.from(impactedFiles),
      invalidatedSymbols: impactedSymbolIds,
      invalidatedClaims,
      invalidatedChunks,
      propagationDepth,
      durationMs,
    };

    this.telemetry.log('info', 'invalidation.complete', {
      durationMs,
      invalidatedFiles: result.invalidatedFiles.length,
      invalidatedSymbols: result.invalidatedSymbols.length,
    });

    return result;
  }

  private computeDepth(seedIds: string[], allImpacted: string[]): number {
    if (allImpacted.length === 0) return 0;
    const seedSet = new Set(seedIds);
    let maxDepth = 0;
    // BFS from seeds, compute max depth to any impacted node
    const visited = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = seedIds.map(id => ({ id, depth: 0 }));
    for (const id of seedIds) visited.set(id, 0);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.depth > maxDepth) maxDepth = item.depth;
      const deps = this.graph.getDependencies(item.id, 1);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          visited.set(dep, item.depth + 1);
          queue.push({ id: dep, depth: item.depth + 1 });
        }
      }
    }

    // Suppress unused seedSet (used for logical clarity in BFS init)
    void seedSet;
    return maxDepth;
  }
}
