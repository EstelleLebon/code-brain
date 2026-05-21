"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Indexer = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const ast_js_1 = require("../parser/ast.js");
const extractor_js_1 = require("../parser/extractor.js");
const chunker_js_1 = require("../chunks/chunker.js");
function walkDirectory(dir) {
    const files = [];
    try {
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                // Skip common non-source dirs
                if (['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
                    continue;
                }
                files.push(...walkDirectory(fullPath));
            }
            else if (entry.isFile() && (0, ast_js_1.isSupportedFile)(fullPath)) {
                files.push(fullPath);
            }
        }
    }
    catch {
        // ignore permission errors
    }
    return files;
}
function fileHash(filePath) {
    const content = fs_1.default.readFileSync(filePath);
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex').slice(0, 16);
}
// Build a map from symbol id to raw source text from parsed file
function buildSourceMap(parsed, symbols) {
    const sourceMap = new Map();
    const symByName = new Map();
    for (const sym of symbols) {
        symByName.set(`${sym.name}:${sym.kind}`, sym);
    }
    function processRaw(raw) {
        const key = `${raw.name}:${raw.kind}`;
        const sym = symByName.get(key);
        if (sym) {
            sourceMap.set(sym.id, raw.sourceText);
        }
        if (raw.children) {
            for (const child of raw.children)
                processRaw(child);
        }
    }
    for (const raw of parsed.symbols) {
        processRaw(raw);
    }
    return sourceMap;
}
class Indexer {
    db;
    embedder;
    claimsEngine;
    graph;
    telemetry;
    constructor(db, embedder, claimsEngine, graph, telemetry) {
        this.db = db;
        this.embedder = embedder;
        this.claimsEngine = claimsEngine;
        this.graph = graph;
        this.telemetry = telemetry;
    }
    indexRepository(repoPath) {
        const start = performance.now();
        this.telemetry.log('info', 'indexer.start', { repoPath });
        const files = walkDirectory(repoPath);
        this.telemetry.log('info', 'indexer.files_found', { count: files.length });
        let processed = 0;
        let skipped = 0;
        for (const filePath of files) {
            try {
                const changed = this.indexFile(filePath);
                if (changed)
                    processed++;
                else
                    skipped++;
            }
            catch (err) {
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
    indexFile(filePath) {
        const absPath = path_1.default.resolve(filePath);
        // Check if file has changed
        let currentHash;
        try {
            currentHash = fileHash(absPath);
        }
        catch {
            this.telemetry.log('warn', 'indexer.file_read_error', { filePath: absPath });
            return false;
        }
        const stored = this.db.getFile(absPath);
        if (stored && stored.hash === currentHash) {
            return false; // Unchanged
        }
        return this.telemetry.time(`indexer.file`, () => {
            // Parse
            const parsed = (0, ast_js_1.parseFile)(absPath);
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
            const symbols = (0, extractor_js_1.extractSymbols)(parsed);
            this.db.insertSymbolsBatch(symbols);
            this.telemetry.metric('indexer.symbols', symbols.length, { file: absPath });
            // Chunks
            const sourceMap = buildSourceMap(parsed, symbols);
            const chunks = (0, chunker_js_1.chunkSymbols)(symbols, sourceMap);
            this.db.insertChunksBatch(chunks);
            // Embeddings
            const embeddingItems = chunks.map(c => ({
                chunkId: c.id,
                text: (c.content + ' ' + (c.summary ?? '')).trim(),
            }));
            this.embedder.computeAndStoreBatch(embeddingItems);
            // Intra-file edges
            const allSymbolIds = (0, extractor_js_1.buildSymbolIdSet)(this.db.getAllSymbols());
            const edges = (0, extractor_js_1.extractEdges)(parsed, symbols, allSymbolIds);
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
    resolveInterFileEdges(files) {
        // This pass builds edges from imports after all files are indexed
        // so we can resolve cross-file references
        const allSymbols = this.db.getAllSymbols();
        const allSymbolIds = (0, extractor_js_1.buildSymbolIdSet)(allSymbols);
        const newEdges = [];
        for (const filePath of files) {
            try {
                const parsed = (0, ast_js_1.parseFile)(filePath);
                const localSymbols = this.db.getSymbolsByFile(filePath);
                const edges = (0, extractor_js_1.extractEdges)(parsed, localSymbols, allSymbolIds);
                for (const edge of edges) {
                    // Only add if both endpoints exist
                    if (allSymbolIds.has(edge.fromId) && allSymbolIds.has(edge.toId)) {
                        newEdges.push(edge);
                    }
                }
            }
            catch {
                // ignore
            }
        }
        if (newEdges.length > 0) {
            this.db.insertEdgesBatch(newEdges);
            this.graph.addEdges(newEdges);
            this.telemetry.log('info', 'indexer.inter_file_edges', { count: newEdges.length });
        }
    }
    updateFile(filePath) {
        return this.indexFile(filePath);
    }
    getStats(durationMs = 0) {
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
exports.Indexer = Indexer;
//# sourceMappingURL=indexer.js.map