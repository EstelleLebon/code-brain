"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const index_js_1 = require("../types/index.js");
const schema_js_1 = require("../models/schema.js");
class DB {
    db;
    constructor(dbPath) {
        const dir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 10000');
        this.db.pragma('foreign_keys = ON');
        this.initialize();
        this.runMigrations();
    }
    runMigrations() {
        const currentVersion = parseInt(this.getMeta('schema_version') ?? '1', 10);
        for (const migration of schema_js_1.MIGRATIONS) {
            if (migration.version > currentVersion && migration.sql.trim()) {
                // SQLite doesn't support multi-statement in exec for ALTER TABLE in a single call
                const stmts = migration.sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
                for (const stmt of stmts) {
                    try {
                        this.db.exec(stmt);
                    }
                    catch {
                        // Column may already exist (idempotent)
                    }
                }
                this.setMeta('schema_version', String(migration.version));
            }
        }
    }
    initialize() {
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
    upsertFile(filePath, hash) {
        this.db.prepare(`
      INSERT INTO files (path, hash, indexed_at)
      VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET hash = excluded.hash, indexed_at = excluded.indexed_at
    `).run(filePath, hash, Date.now());
    }
    getFile(filePath) {
        return this.db.prepare('SELECT * FROM files WHERE path = ?').get(filePath);
    }
    deleteFile(filePath) {
        this.db.prepare('DELETE FROM files WHERE path = ?').run(filePath);
    }
    getAllFiles() {
        return this.db.prepare('SELECT * FROM files').all();
    }
    // ── Symbols ───────────────────────────────────────────────────────────────
    insertSymbol(sym) {
        this.db.prepare(`
      INSERT OR REPLACE INTO symbols
        (id, name, kind, file_path, start_line, end_line, signature, exported, hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sym.id, sym.name, sym.kind, sym.filePath, sym.startLine, sym.endLine, sym.signature ?? null, sym.exported ? 1 : 0, sym.hash, sym.createdAt, sym.updatedAt);
    }
    insertSymbolsBatch(symbols) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO symbols
        (id, name, kind, file_path, start_line, end_line, signature, exported, hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const tx = this.db.transaction((syms) => {
            for (const sym of syms) {
                stmt.run(sym.id, sym.name, sym.kind, sym.filePath, sym.startLine, sym.endLine, sym.signature ?? null, sym.exported ? 1 : 0, sym.hash, sym.createdAt, sym.updatedAt);
            }
        });
        tx(symbols);
    }
    getSymbolById(id) {
        const row = this.db.prepare('SELECT * FROM symbols WHERE id = ?').get(id);
        return row ? this.rowToSymbol(row) : undefined;
    }
    getSymbolByName(name) {
        const rows = this.db.prepare('SELECT * FROM symbols WHERE name = ?').all(name);
        return rows.map(r => this.rowToSymbol(r));
    }
    searchSymbolsByName(pattern) {
        const rows = this.db.prepare('SELECT * FROM symbols WHERE name LIKE ? LIMIT 50').all(`%${pattern}%`);
        return rows.map(r => this.rowToSymbol(r));
    }
    getSymbolsByFile(filePath) {
        const rows = this.db.prepare('SELECT * FROM symbols WHERE file_path = ?').all(filePath);
        return rows.map(r => this.rowToSymbol(r));
    }
    deleteSymbolsByFile(filePath) {
        this.db.prepare('DELETE FROM symbols WHERE file_path = ?').run(filePath);
    }
    getAllSymbols() {
        const rows = this.db.prepare('SELECT * FROM symbols').all();
        return rows.map(r => this.rowToSymbol(r));
    }
    countSymbols() {
        const row = this.db.prepare('SELECT COUNT(*) as c FROM symbols').get();
        return row.c;
    }
    rowToSymbol(row) {
        const deps = this.getOutgoingEdges(row['id']).map(e => e.toId);
        return {
            id: row['id'],
            name: row['name'],
            kind: row['kind'],
            filePath: row['file_path'],
            startLine: row['start_line'],
            endLine: row['end_line'],
            signature: row['signature'],
            exported: row['exported'] === 1,
            dependencies: deps,
            hash: row['hash'],
            createdAt: row['created_at'],
            updatedAt: row['updated_at'],
        };
    }
    // ── Chunks ────────────────────────────────────────────────────────────────
    insertChunk(chunk) {
        this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, symbol_id, content, summary, hash, truth_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(chunk.id, chunk.symbolId, chunk.content, chunk.summary ?? null, chunk.hash, chunk.truthLevel);
    }
    insertChunksBatch(chunks) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunks (id, symbol_id, content, summary, hash, truth_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const tx = this.db.transaction((cs) => {
            for (const c of cs) {
                stmt.run(c.id, c.symbolId, c.content, c.summary ?? null, c.hash, c.truthLevel);
            }
        });
        tx(chunks);
    }
    getChunkBySymbolId(symbolId) {
        const row = this.db.prepare('SELECT * FROM chunks WHERE symbol_id = ?').get(symbolId);
        return row ? this.rowToChunk(row) : undefined;
    }
    getAllChunks() {
        const rows = this.db.prepare('SELECT * FROM chunks').all();
        return rows.map(r => this.rowToChunk(r));
    }
    deleteChunksBySymbolIds(symbolIds) {
        if (symbolIds.length === 0)
            return;
        const placeholders = symbolIds.map(() => '?').join(',');
        this.db.prepare(`DELETE FROM chunks WHERE symbol_id IN (${placeholders})`).run(...symbolIds);
    }
    countChunks() {
        const row = this.db.prepare('SELECT COUNT(*) as c FROM chunks').get();
        return row.c;
    }
    rowToChunk(row) {
        return {
            id: row['id'],
            symbolId: row['symbol_id'],
            content: row['content'],
            summary: row['summary'],
            hash: row['hash'],
            truthLevel: (row['truth_level'] ?? index_js_1.TruthLevel.STRUCTURAL),
        };
    }
    // ── Embeddings ────────────────────────────────────────────────────────────
    insertEmbedding(chunkId, vector) {
        const buf = Buffer.from(vector.buffer);
        this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (chunk_id, vector) VALUES (?, ?)
    `).run(chunkId, buf);
    }
    insertEmbeddingsBatch(items) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO embeddings (chunk_id, vector) VALUES (?, ?)');
        const tx = this.db.transaction((its) => {
            for (const item of its) {
                stmt.run(item.chunkId, Buffer.from(item.vector.buffer));
            }
        });
        tx(items);
    }
    getAllEmbeddings() {
        const rows = this.db.prepare('SELECT chunk_id, vector FROM embeddings').all();
        return rows.map(r => ({
            chunkId: r.chunk_id,
            vector: new Float32Array(r.vector.buffer, r.vector.byteOffset, r.vector.byteLength / 4),
        }));
    }
    // ── Edges ─────────────────────────────────────────────────────────────────
    insertEdge(edge) {
        this.db.prepare(`
      INSERT OR IGNORE INTO edges (from_id, to_id, kind) VALUES (?, ?, ?)
    `).run(edge.fromId, edge.toId, edge.kind);
    }
    insertEdgesBatch(edges) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO edges (from_id, to_id, kind) VALUES (?, ?, ?)');
        const tx = this.db.transaction((es) => {
            for (const e of es) {
                stmt.run(e.fromId, e.toId, e.kind);
            }
        });
        tx(edges);
    }
    getOutgoingEdges(fromId) {
        const rows = this.db.prepare('SELECT * FROM edges WHERE from_id = ?').all(fromId);
        return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind }));
    }
    getIncomingEdges(toId) {
        const rows = this.db.prepare('SELECT * FROM edges WHERE to_id = ?').all(toId);
        return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind }));
    }
    deleteEdgesBySymbolId(symbolId) {
        this.db.prepare('DELETE FROM edges WHERE from_id = ? OR to_id = ?').run(symbolId, symbolId);
    }
    deleteEdgesByFile(filePath) {
        const symbols = this.db.prepare('SELECT id FROM symbols WHERE file_path = ?').all(filePath);
        for (const s of symbols) {
            this.db.prepare('DELETE FROM edges WHERE from_id = ?').run(s.id);
        }
    }
    getAllEdges() {
        const rows = this.db.prepare('SELECT * FROM edges').all();
        return rows.map(r => ({ fromId: r.from_id, toId: r.to_id, kind: r.kind }));
    }
    countEdges() {
        const row = this.db.prepare('SELECT COUNT(*) as c FROM edges').get();
        return row.c;
    }
    // ── Claims ────────────────────────────────────────────────────────────────
    insertClaim(claim) {
        this.db.prepare(`
      INSERT OR REPLACE INTO claims (id, symbol_id, claim, confidence, source_hash, truth_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(claim.id, claim.symbolId, claim.claim, claim.confidence, claim.sourceHash, claim.truthLevel);
    }
    insertClaimsBatch(claims) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO claims (id, symbol_id, claim, confidence, source_hash, truth_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const tx = this.db.transaction((cs) => {
            for (const c of cs) {
                stmt.run(c.id, c.symbolId, c.claim, c.confidence, c.sourceHash, c.truthLevel);
            }
        });
        tx(claims);
    }
    getClaimsBySymbolId(symbolId) {
        const rows = this.db.prepare('SELECT * FROM claims WHERE symbol_id = ?').all(symbolId);
        return rows.map(r => ({
            id: r['id'],
            symbolId: r['symbol_id'],
            claim: r['claim'],
            confidence: r['confidence'],
            sourceHash: r['source_hash'],
            truthLevel: (r['truth_level'] ?? index_js_1.TruthLevel.DERIVED),
        }));
    }
    deleteClaimsBySymbolId(symbolId) {
        this.db.prepare('DELETE FROM claims WHERE symbol_id = ?').run(symbolId);
    }
    countClaims() {
        const row = this.db.prepare('SELECT COUNT(*) as c FROM claims').get();
        return row.c;
    }
    // ── Meta ──────────────────────────────────────────────────────────────────
    setMeta(key, value) {
        this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
    }
    getMeta(key) {
        const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
        return row?.value;
    }
    // ── Transactions ──────────────────────────────────────────────────────────
    transaction(fn) {
        return this.db.transaction(fn)();
    }
    close() {
        this.db.close();
    }
}
exports.DB = DB;
//# sourceMappingURL=db.js.map