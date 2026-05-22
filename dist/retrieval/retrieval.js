"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Retrieval = void 0;
const index_js_1 = require("../types/index.js");
const entropy_js_1 = require("./entropy.js");
const SessionContext_js_1 = require("../session/SessionContext.js");
const SessionBias_js_1 = require("../session/SessionBias.js");
const RetrievalValidator_js_1 = require("./validation/RetrievalValidator.js");
class Retrieval {
    db;
    embedder;
    graph;
    telemetry;
    sessionManager;
    validator;
    constructor(db, embedder, graph, telemetry, sessionManager) {
        this.db = db;
        this.embedder = embedder;
        this.graph = graph;
        this.telemetry = telemetry;
        this.sessionManager = sessionManager ?? new SessionContext_js_1.SessionManager();
        this.validator = new RetrievalValidator_js_1.RetrievalValidator();
    }
    findRelevant(query, limit = 10, options = {}) {
        return this.telemetry.time(`retrieval.findRelevant`, () => {
            this.telemetry.log('debug', 'retrieval.query', { query, limit });
            const queryVec = this.embedder.embed(query);
            const similar = this.embedder.findSimilar(queryVec, limit * 3);
            const results = [];
            const seen = new Set();
            for (const { chunkId, similarity: score } of similar) {
                if (results.length >= limit)
                    break;
                const chunk = this.getChunkById(chunkId);
                if (!chunk)
                    continue;
                const sym = this.db.getSymbolById(chunk.symbolId);
                if (sym && !seen.has(sym.id)) {
                    seen.add(sym.id);
                    const trace = {
                        source: sym.filePath,
                        retrievalReason: 'semantic_similarity',
                        confidence: Math.min(1, Math.max(0, score)),
                        truthLevel: chunk.truthLevel ?? index_js_1.TruthLevel.STRUCTURAL,
                    };
                    results.push({ chunk, score, trace });
                }
            }
            // Fall back to symbol name search if not enough results
            if (results.length < limit) {
                const words = query.split(/\s+/).filter(w => w.length > 2);
                for (const word of words) {
                    if (results.length >= limit)
                        break;
                    const matches = this.db.searchSymbolsByName(word);
                    for (const sym of matches) {
                        if (!seen.has(sym.id)) {
                            seen.add(sym.id);
                            const chunk = this.db.getChunkBySymbolId(sym.id);
                            if (chunk) {
                                const trace = {
                                    source: sym.filePath,
                                    retrievalReason: 'symbol_match',
                                    confidence: 0.5,
                                    truthLevel: chunk.truthLevel ?? index_js_1.TruthLevel.STRUCTURAL,
                                };
                                results.push({ chunk, score: 0.5, trace });
                            }
                            if (results.length >= limit)
                                break;
                        }
                    }
                }
            }
            // Apply session bias if sessionId provided
            let finalResults = results;
            if (options.sessionId) {
                const session = this.sessionManager.getSession(options.sessionId);
                if (session) {
                    finalResults = (0, SessionBias_js_1.applySessionBias)(results, session);
                    // Record accesses
                    for (const r of finalResults) {
                        this.sessionManager.recordAccess(options.sessionId, r.chunk.symbolId, r.trace.source);
                    }
                }
            }
            // Compute and log entropy metrics
            const entropy = (0, entropy_js_1.computeEntropyMetrics)(finalResults);
            this.telemetry.log('debug', 'retrieval.entropy', {
                redundancyScore: entropy.redundancyScore,
                overlapScore: entropy.overlapScore,
                diversityScore: entropy.diversityScore,
                signalNoiseRatio: entropy.signalNoiseRatio,
                chunkCount: entropy.chunkCount,
            });
            // Validation
            const chunksWithFilePath = finalResults.map(r => ({
                ...r.chunk,
                filePath: r.trace.source,
            }));
            const validationResult = this.validator.validate(chunksWithFilePath);
            this.telemetry.log('info', 'retrieval.validation', {
                valid: validationResult.valid,
                staleArtifacts: validationResult.staleArtifacts,
                contradictions: validationResult.contradictions,
                warnings: validationResult.warnings,
            });
            this.telemetry.metric('retrieval.results', finalResults.length, { query: query.slice(0, 50) });
            return finalResults;
        });
    }
    getSymbol(name) {
        // Exact match first
        const exact = this.db.getSymbolByName(name);
        if (exact.length > 0)
            return exact[0];
        // Fuzzy search
        const fuzzy = this.db.searchSymbolsByName(name);
        return fuzzy[0] ?? null;
    }
    getSymbolById(id) {
        return this.db.getSymbolById(id) ?? null;
    }
    getDependencies(id, depth = 2) {
        const depIds = this.graph.getDependencies(id, depth);
        const symbols = [];
        for (const depId of depIds) {
            const sym = this.db.getSymbolById(depId);
            if (sym)
                symbols.push(sym);
        }
        return symbols;
    }
    getDependents(id, depth = 2) {
        const depIds = this.graph.getDependents(id, depth);
        const symbols = [];
        for (const depId of depIds) {
            const sym = this.db.getSymbolById(depId);
            if (sym)
                symbols.push(sym);
        }
        return symbols;
    }
    queryContext(task, options = {}) {
        return this.telemetry.time('retrieval.queryContext', () => {
            // Find directly relevant symbols
            const directResults = this.findRelevant(task, 5, options);
            const directSymbolIds = directResults.map(r => r.chunk.symbolId);
            const expandedIds = new Set(directSymbolIds);
            // Expand by dependencies (1 level)
            for (const symId of directSymbolIds) {
                const deps = this.graph.getDependencies(symId, 1);
                for (const depId of deps)
                    expandedIds.add(depId);
                const dependents = this.graph.getDependents(symId, 1);
                for (const depId of dependents)
                    expandedIds.add(depId);
            }
            // Fetch all expanded symbols
            const allSymbols = [];
            for (const id of expandedIds) {
                const sym = this.db.getSymbolById(id);
                if (sym)
                    allSymbols.push(sym);
            }
            // Build RetrievalResult for expanded symbols
            const directResultSet = new Set(directResults.map(r => r.chunk.symbolId));
            const allResults = [...directResults];
            for (const sym of allSymbols) {
                if (directResultSet.has(sym.id))
                    continue;
                const chunk = this.db.getChunkBySymbolId(sym.id);
                if (chunk) {
                    const trace = {
                        source: sym.filePath,
                        retrievalReason: 'dependency_expansion',
                        confidence: 0.6,
                        truthLevel: chunk.truthLevel ?? index_js_1.TruthLevel.STRUCTURAL,
                    };
                    allResults.push({ chunk, score: 0.6, trace });
                }
            }
            // Compute and log entropy for full result set
            const entropy = (0, entropy_js_1.computeEntropyMetrics)(allResults);
            this.telemetry.log('debug', 'retrieval.entropy', {
                redundancyScore: entropy.redundancyScore,
                overlapScore: entropy.overlapScore,
                diversityScore: entropy.diversityScore,
                signalNoiseRatio: entropy.signalNoiseRatio,
                chunkCount: entropy.chunkCount,
            });
            const chunks = allResults.map(r => r.chunk);
            // Validation
            const chunksWithFilePath = allResults.map(r => ({
                ...r.chunk,
                filePath: r.trace.source,
            }));
            const validationResult = this.validator.validate(chunksWithFilePath);
            this.telemetry.log('info', 'retrieval.validation', {
                valid: validationResult.valid,
                staleArtifacts: validationResult.staleArtifacts,
                contradictions: validationResult.contradictions,
                warnings: validationResult.warnings,
            });
            return { symbols: allSymbols, chunks, expandedIds, results: allResults };
        });
    }
    getSessionManager() {
        return this.sessionManager;
    }
    getChunkById(chunkId) {
        const chunks = this.db.getAllChunks();
        return chunks.find(c => c.id === chunkId);
    }
    refreshGraph() {
        this.graph.clear();
        const edges = this.db.getAllEdges();
        this.graph.addEdges(edges);
    }
}
exports.Retrieval = Retrieval;
//# sourceMappingURL=retrieval.js.map