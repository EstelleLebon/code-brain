import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SymbolNode, SemanticChunk, Claim, DependencyEdge, TruthLevel } from '../types/index.js';
import { MIGRATIONS } from '../models/schema.js';

export class DB {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
    this.runMigrations();
  }

  private runMigrations(): void {
    const currentVersion = parseInt(this.getMeta('schema_version') ?? '1', 10);
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion && migration.sql.trim()) {
        // SQLite doesn't support multi-statement in exec for ALTER TABLE in a single call
        const stmts = migration.sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of stmts) {
          try {
            this.db.exec(stmt);
          } catch {
            // Column may already exist (idempotent)
          }
        }
        this.setMeta('schema_version', String(migration.version));
      }
    }
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        hash TEXT NOT NULL,
        indexed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS symbols (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        signature TEXT,
        exported INTEGER NOT NULL DEFAULT 0,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
      CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        symbol_id TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        hash TEXT NOT NULL,
        FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_symbol ON chunks(symbol_id);

      CREATE TABLE IF NOT EXISTS embeddings (
        chunk_id TEXT PRIMARY KEY,
        vector BLOB NOT NULL,
        FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS edges (
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        PRIMARY KEY (from_id, to_id, kind),
        FOREIGN KEY (from_id) REFERENCES symbols(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
      CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);

      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        symbol_id TEXT NOT NULL,
        claim TEXT NOT NULL,
        confidence REAL NOT NULL,
        source_hash TEXT NOT NULL,
        FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_claims_symbol ON claims(symbol_id);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  // ── Files ─────────────────────────────────────────────────────────────────

  upsertFile(filePath: string, hash: string): void {
    this.db.prepare(`
      INSERT INTO files (path, hash, indexed_at)
      VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET hash = excluded.hash, indexed_at = excluded.indexed_at
    `).run(filePath, hash, Date.now());
  }

  getFile(filePath: string): { path: string; hash: string; indexed_at: number } | undefined {
    return this.db.prepare('SELECT * FROM files WHERE path = ?').get(filePath) as
      { path: string; hash: string; indexed_at: number } | undefined;
  }

  deleteFile(filePath: string): void {
    this.db.prepare('DELETE FROM files WHERE path = ?').run(filePath);
  }

  getAllFiles(): Array<{ path: string; hash: string; indexed_at: number }> {
    return this.db.prepare('SELECT * FROM files').all() as Array<{ path: string; hash: string; indexed_at: number }>;
  }

  // ── Symbols ───────────────────────────────────────────────────────────────

  insertSymbol(sym: SymbolNode): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO symbols
        (id, name, kind, file_path, start_line, end_line, signature, exported, hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sym.id, sym.name, sym.kind, sym.filePath,
      sym.startLine, sym.endLine, sym.signature ?? null,
      sym.exported ? 1 : 0,
      sym.hash, sym.createdAt, sym.updatedAt
    );
  }

  insertSymbolsBatch(symbols: SymbolNode[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO symbols
        (id, name, kind, file_path, start_line, end_line, signature, exported, hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.transaction((syms: SymbolNode[]) => {
      for (const sym of syms) {
        stmt.run(
          sym.id, sym.name, sym.kind, sym.filePath,
          sym.startLine, sym.endLine, sym.signature ?? null,
          sym.exported ? 1 : 0,
          sym.hash, sym.createdAt, sym.updatedAt
        );
      }
    });
    tx(symbols);
  }

  getSymbolById(id: string): SymbolNode | undefined {
    const row = this.db.prepare('SELECT * FROM symbols WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToSymbol(row) : undefined;
  }

  getSymbolByName(name: string): SymbolNode[] {
    const rows = this.db.prepare('SELECT * FROM symbols WHERE name = ?').all(name) as Record<string, unknown>[];
    return rows.map(r => this.rowToSymbol(r));
  }

  searchSymbolsByName(pattern: string): SymbolNode[] {
    const rows = this.db.prepare('SELECT * FROM symbols WHERE name LIKE ? LIMIT 50').all(`%${pattern}%`) as Record<string, unknown>[];
    return rows.map(r => this.rowToSymbol(r));
  }

  getSymbolsByFile(filePath: string): SymbolNode[] {
    const rows = this.db.prepare('SELECT * FROM symbols WHERE file_path = ?').all(filePath) as Record<string, unknown>[];
    return rows.map(r => this.rowToSymbol(r));
  }

  deleteSymbolsByFile(filePath: string): void {
    this.db.prepare('DELETE FROM symbols WHERE file_path = ?').run(filePath);
  }

  getAllSymbols(): SymbolNode[] {
    const rows = this.db.prepare('SELECT * FROM symbols').all() as Record<string, unknown>[];
    return rows.map(r => this.rowToSymbol(r));
  }

  countSymbols(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM symbols').get() as { c: number };
    return row.c;
  }

  private rowToSymbol(row: Record<string, unknown>): SymbolNode {
    const deps = this.getOutgoingEdges(row['id'] as string).map(e => e.toId);
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      kind: row['kind'] as SymbolNode['kind'],
      filePath: row['file_path'] as string,
      startLine: row['start_line'] as number,
      endLine: row['end_line'] as number,
      signature: row['signature'] as string | undefined,
      exported: (row['exported'] as number) === 1,
      dependencies: deps,
      hash: row['hash'] as string,
      createdAt: row['created_at'] as number,
      updatedAt: row['updated_at'] as number,
    };
  }

  // ── Chunks ────────────────────────────────────────────────────────────────

  insertChunk(chunk: SemanticChunk): void {
    const existing = this.db.prepare('SELECT version FROM chunks WHERE id = ?').get(chunk.id) as { version: number } | undefined;
    const version = existing ? existing.version + 1 : 1;
    this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, symbol_id, content, summary, hash, truth_level, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(chunk.id, chunk.symbolId, chunk.content, chunk.summary ?? null, chunk.hash, chunk.truthLevel, version);
  }

  insertChunksBatch(chunks: SemanticChunk[]): void {
    const getVersion = this.db.prepare('SELECT version FROM chunks WHERE id = ?');
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, symbol_id, content, summary, hash, truth_level, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.transaction((cs: SemanticChunk[]) => {
      for (const c of cs) {
        const existing = getVersion.get(c.id) as { version: number } | undefined;
        const version = existing ? existing.version + 1 : 1;
        stmt.run(c.id, c.symbolId, c.content, c.summary ?? null, c.hash, c.truthLevel, version);
      }
    });
    tx(chunks);
  }

  getChunkBySymbolId(symbolId: string): SemanticChunk | undefined {
    const row = this.db.prepare('SELECT * FROM chunks WHERE symbol_id = ?').get(symbolId) as Record<string, unknown> | undefined;
    return row ? this.rowToChunk(row) : undefined;
  }

  getAllChunks(): SemanticChunk[] {
    const rows = this.db.prepare('SELECT * FROM chunks').all() as Record<string, unknown>[];
    return rows.map(r => this.rowToChunk(r));
  }

  deleteChunksBySymbolIds(symbolIds: string[]): void {
    if (symbolIds.length === 0) return;
    const placeholders = symbolIds.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM chunks WHERE symbol_id IN (${placeholders})`).run(...symbolIds);
  }

  countChunks(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM chunks').get() as { c: number };
    return row.c;
  }

  private rowToChunk(row: Record<string, unknown>): SemanticChunk {
    return {
      id: row['id'] as string,
      symbolId: row['symbol_id'] as string,
      content: row['content'] as string,
      summary: row['summary'] as string | undefined,
      hash: row['hash'] as string,
      truthLevel: (row['truth_level'] as number ?? TruthLevel.STRUCTURAL) as TruthLevel,
    };
  }

  // ── Embeddings ────────────────────────────────────────────────────────────

  insertEmbedding(chunkId: string, vector: Float32Array): void {
    const buf = Buffer.from(vector.buffer);
    this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (chunk_id, vector) VALUES (?, ?)
    `).run(chunkId, buf);
  }

  insertEmbeddingsBatch(items: Array<{ chunkId: string; vector: Float32Array }>): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO embeddings (chunk_id, vector) VALUES (?, ?)');
    const tx = this.db.transaction((its: typeof items) => {
      for (const item of its) {
        stmt.run(item.chunkId, Buffer.from(item.vector.buffer));
      }
    });
    tx(items);
  }

  getAllEmbeddings(): Array<{ chunkId: string; vector: Float32Array }> {
    const rows = this.db.prepare('SELECT chunk_id, vector FROM embeddings').all() as Array<{ chunk_id: string; vector: Buffer }>;
    return rows.map(r => ({
      chunkId: r.chunk_id,
      vector: new Float32Array(r.vector.buffer, r.vector.byteOffset, r.vector.byteLength / 4),
    }));
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  insertEdge(edge: DependencyEdge): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO edges (from_id, to_id, kind) VALUES (?, ?, ?)
    `).run(edge.fromId, edge.toId, edge.kind);
  }

  insertEdgesBatch(edges: DependencyEdge[]): void {
    const stmt = this.db.prepare('INSERT OR IGNORE INTO edges (from_id, to_id, kind) VALUES (?, ?, ?)');
    const tx = this.db.transaction((es: DependencyEdge[]) => {
      for (const e of es) {
        stmt.run(e.fromId, e.toId, e.kind);
      }
    });
    tx(edges);
  }

  getOutgoingEdges(fromId: string): DependencyEdge[] {
    const rows = this.db.prepare('SELECT * FROM edges WHERE from_id = ?').all(fromId) as Array<{ from_id: string; to_id: string; kind: string }>;
    return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind as DependencyEdge['kind'] }));
  }

  getIncomingEdges(toId: string): DependencyEdge[] {
    const rows = this.db.prepare('SELECT * FROM edges WHERE to_id = ?').all(toId) as Array<{ from_id: string; to_id: string; kind: string }>;
    return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind as DependencyEdge['kind'] }));
  }

  deleteEdgesBySymbolId(symbolId: string): void {
    this.db.prepare('DELETE FROM edges WHERE from_id = ? OR to_id = ?').run(symbolId, symbolId);
  }

  deleteEdgesByFile(filePath: string): void {
    const symbols = this.db.prepare('SELECT id FROM symbols WHERE file_path = ?').all(filePath) as Array<{ id: string }>;
    for (const s of symbols) {
      this.db.prepare('DELETE FROM edges WHERE from_id = ?').run(s.id);
    }
  }

  getAllEdges(): DependencyEdge[] {
    const rows = this.db.prepare('SELECT * FROM edges').all() as Array<{ from_id: string; to_id: string; kind: string }>;
    return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind as DependencyEdge['kind'] }));
  }

  countEdges(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM edges').get() as { c: number };
    return row.c;
  }

  // ── Claims ────────────────────────────────────────────────────────────────

  insertClaim(claim: Claim): void {
    const existing = this.db.prepare('SELECT version FROM claims WHERE id = ?').get(claim.id) as { version: number } | undefined;
    const version = existing ? existing.version + 1 : 1;
    this.db.prepare(`
      INSERT OR REPLACE INTO claims (id, symbol_id, claim, confidence, source_hash, truth_level, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(claim.id, claim.symbolId, claim.claim, claim.confidence, claim.sourceHash, claim.truthLevel, version);
  }

  insertClaimsBatch(claims: Claim[]): void {
    const getVersion = this.db.prepare('SELECT version FROM claims WHERE id = ?');
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO claims (id, symbol_id, claim, confidence, source_hash, truth_level, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.transaction((cs: Claim[]) => {
      for (const c of cs) {
        const existing = getVersion.get(c.id) as { version: number } | undefined;
        const version = existing ? existing.version + 1 : 1;
        stmt.run(c.id, c.symbolId, c.claim, c.confidence, c.sourceHash, c.truthLevel, version);
      }
    });
    tx(claims);
  }

  getClaimsBySymbolId(symbolId: string): Claim[] {
    const rows = this.db.prepare('SELECT * FROM claims WHERE symbol_id = ?').all(symbolId) as Array<Record<string, unknown>>;
    return rows.map(r => ({
      id: r['id'] as string,
      symbolId: r['symbol_id'] as string,
      claim: r['claim'] as string,
      confidence: r['confidence'] as number,
      sourceHash: r['source_hash'] as string,
      truthLevel: (r['truth_level'] as number ?? TruthLevel.DERIVED) as TruthLevel,
    }));
  }

  deleteClaimsBySymbolId(symbolId: string): void {
    this.db.prepare('DELETE FROM claims WHERE symbol_id = ?').run(symbolId);
  }

  countClaims(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM claims').get() as { c: number };
    return row.c;
  }

  // ── Meta ──────────────────────────────────────────────────────────────────

  setMeta(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
  }

  getMeta(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}
