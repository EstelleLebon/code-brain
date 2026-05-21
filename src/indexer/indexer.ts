import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { ClaimsEngine } from '../claims/claims-engine.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { parseFile, isSupportedFile } from '../parser/ast.js';
import { extractSymbols, extractEdges, buildSymbolIdSet } from '../parser/extractor.js';
import { chunkSymbols } from '../chunks/chunker.js';
import { IndexStats, SymbolNode, DependencyEdge, ParsedFile, RawSymbol } from '../types/index.js';

function walkDirectory(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip common non-source dirs
        if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
          continue;
        }
        files.push(...walkDirectory(fullPath));
      } else if (entry.isFile() && isSupportedFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch {
    // ignore permission errors
  }
  return files;
}

function fileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// Build a map from symbol id to raw source text from parsed file
function buildSourceMap(parsed: ParsedFile, symbols: SymbolNode[]): Map<string, string> {
  const sourceMap = new Map<string, string>();
  const symByName = new Map<string, SymbolNode>();
  for (const sym of symbols) {
    symByName.set(`${sym.name}:${sym.kind}`, sym);
  }

  function processRaw(raw: RawSymbol): void {
    const key = `${raw.name}:${raw.kind}`;
    const sym = symByName.get(key);
    if (sym) {
      sourceMap.set(sym.id, raw.sourceText);
    }
    if (raw.children) {
      for (const child of raw.children) processRaw(child);
    }
  }

  for (const raw of parsed.symbols) {
    processRaw(raw);
  }

  return sourceMap;
}

export class Indexer {
  private db: DB;
  private embedder: Embedder;
  private claimsEngine: ClaimsEngine;
  private graph: DependencyGraph;
  private telemetry: Telemetry;

  constructor(
    db: DB,
    embedder: Embedder,
    claimsEngine: ClaimsEngine,
    graph: DependencyGraph,
    telemetry: Telemetry
  ) {
    this.db = db;
    this.embedder = embedder;
    this.claimsEngine = claimsEngine;
    this.graph = graph;
    this.telemetry = telemetry;
  }

  indexRepository(repoPath: string): IndexStats {
    const start = performance.now();
    this.telemetry.log('info', 'indexer.start', { repoPath });

    const files = walkDirectory(repoPath);
    this.telemetry.log('info', 'indexer.files_found', { count: files.length });

    let processed = 0;
    let skipped = 0;

    for (const filePath of files) {
      try {
        const changed = this.indexFile(filePath);
        if (changed) processed++;
        else skipped++;
      } catch (err) {
        this.telemetry.log('warn', 'indexer.file_error', { filePath, error: String(err) });
      }
    }

    // After all files indexed, resolve inter-file edges
    this.resolveInterFileEdges(files);

    // Rebuild embedder vocabulary now that we have chunks
    this.embedder.rebuildVocabulary();

    const durationMs = Math.round(performance.now() - start);
    const stats = this.getStats(durationMs);

    this.db.setMeta('last_indexed', String(Date.now()));
    this.db.setMeta('last_duration_ms', String(durationMs));

    this.telemetry.log('info', 'indexer.complete', { processed, skipped, ...stats, durationMs });
    return stats;
  }

  indexFile(filePath: string): boolean {
    const absPath = path.resolve(filePath);

    // Check if file has changed
    let currentHash: string;
    try {
      currentHash = fileHash(absPath);
    } catch {
      this.telemetry.log('warn', 'indexer.file_read_error', { filePath: absPath });
      return false;
    }

    const stored = this.db.getFile(absPath);
    if (stored && stored.hash === currentHash) {
      return false; // Unchanged
    }

    return this.telemetry.time(`indexer.file`, () => {
      // Parse
      const parsed = parseFile(absPath);
      this.telemetry.log('debug', 'indexer.file_parsed', { filePath: absPath, symbolCount: parsed.symbols.length });

      // Remove old data for this file
      this.db.transaction(() => {
        // Delete old edges from symbols in this file (before deleting symbols)
        const oldSymbols = this.db.getSymbolsByFile(absPath);
        for (const sym of oldSymbols) {
          this.graph.removeEdgesFrom(sym.id);
          this.db.deleteEdgesBySymbolId(sym.id);
        }
        this.db.deleteSymbolsByFile(absPath);
      });

      // Extract and store new symbols
      const symbols = extractSymbols(parsed);
      this.db.insertSymbolsBatch(symbols);
      this.telemetry.metric('indexer.symbols', symbols.length, { file: absPath });

      // Chunks
      const sourceMap = buildSourceMap(parsed, symbols);
      const chunks = chunkSymbols(symbols, sourceMap);
      this.db.insertChunksBatch(chunks);

      // Embeddings
      const embeddingItems = chunks.map(c => ({
        chunkId: c.id,
        text: (c.content + ' ' + (c.summary ?? '')).trim(),
      }));
      this.embedder.computeAndStoreBatch(embeddingItems);

      // Intra-file edges
      const allSymbolIds = buildSymbolIdSet(this.db.getAllSymbols());
      const edges = extractEdges(parsed, symbols, allSymbolIds);
      this.db.insertEdgesBatch(edges);
      this.graph.addEdges(edges);

      // Claims
      this.claimsEngine.generateAndStoreClaimsBatch(symbols);

      // Update file record
      this.db.upsertFile(absPath, parsed.hash);

      this.telemetry.log('info', 'indexer.file_indexed', {
        filePath: absPath,
        symbols: symbols.length,
        chunks: chunks.length,
        edges: edges.length,
      });

      return true;
    });
  }

  private resolveInterFileEdges(files: string[]): void {
    // This pass builds edges from imports after all files are indexed
    // so we can resolve cross-file references
    const allSymbols = this.db.getAllSymbols();
    const allSymbolIds = buildSymbolIdSet(allSymbols);

    const newEdges: DependencyEdge[] = [];

    for (const filePath of files) {
      try {
        const parsed = parseFile(filePath);
        const localSymbols = this.db.getSymbolsByFile(filePath);
        const edges = extractEdges(parsed, localSymbols, allSymbolIds);

        for (const edge of edges) {
          // Only add if both endpoints exist
          if (allSymbolIds.has(edge.fromId) && allSymbolIds.has(edge.toId)) {
            newEdges.push(edge);
          }
        }
      } catch {
        // ignore
      }
    }

    if (newEdges.length > 0) {
      this.db.insertEdgesBatch(newEdges);
      this.graph.addEdges(newEdges);
      this.telemetry.log('info', 'indexer.inter_file_edges', { count: newEdges.length });
    }
  }

  updateFile(filePath: string): boolean {
    return this.indexFile(filePath);
  }

  getStats(durationMs = 0): IndexStats {
    const lastIndexedStr = this.db.getMeta('last_indexed');
    return {
      symbolCount: this.db.countSymbols(),
      chunkCount: this.db.countChunks(),
      edgeCount: this.db.countEdges(),
      claimCount: this.db.countClaims(),
      lastIndexed: lastIndexedStr ? parseInt(lastIndexedStr, 10) : Date.now(),
      durationMs,
    };
  }
}
