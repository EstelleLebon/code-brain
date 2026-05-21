"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBrain = void 0;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const db_js_1 = require("../persistence/db.js");
const embedder_js_1 = require("../embeddings/embedder.js");
const dependency_graph_js_1 = require("../graph/dependency-graph.js");
const claims_engine_js_1 = require("../claims/claims-engine.js");
const indexer_js_1 = require("../indexer/indexer.js");
const retrieval_js_1 = require("../retrieval/retrieval.js");
const watcher_js_1 = require("../watcher/watcher.js");
const telemetry_js_1 = require("../telemetry/telemetry.js");
const InvalidationEngine_js_1 = require("../invalidation/InvalidationEngine.js");
const SessionContext_js_1 = require("../session/SessionContext.js");
const ContradictionDetector_js_1 = require("../contradictions/ContradictionDetector.js");
class CodeBrain {
    db;
    embedder;
    graph;
    claimsEngine;
    indexer;
    retrieval;
    watcher;
    telemetry;
    invalidationEngine;
    sessionManager;
    contradictionDetector;
    constructor(config = {}) {
        const dbPath = config.dbPath ?? path_1.default.join(os_1.default.homedir(), '.code-brain', 'index.db');
        const telemetryEnabled = config.telemetry !== false;
        this.telemetry = new telemetry_js_1.Telemetry(telemetryEnabled);
        this.db = new db_js_1.DB(dbPath);
        this.graph = new dependency_graph_js_1.DependencyGraph();
        this.embedder = new embedder_js_1.Embedder(this.db, this.telemetry, config.maxVocabSize ?? 512);
        this.claimsEngine = new claims_engine_js_1.ClaimsEngine(this.db, this.graph);
        this.indexer = new indexer_js_1.Indexer(this.db, this.embedder, this.claimsEngine, this.graph, this.telemetry);
        this.sessionManager = new SessionContext_js_1.SessionManager();
        this.retrieval = new retrieval_js_1.Retrieval(this.db, this.embedder, this.graph, this.telemetry, this.sessionManager);
        this.watcher = new watcher_js_1.Watcher(this.indexer, this.embedder, this.telemetry);
        this.invalidationEngine = new InvalidationEngine_js_1.InvalidationEngine(this.db, this.graph, this.telemetry);
        this.contradictionDetector = new ContradictionDetector_js_1.ContradictionDetector();
        // Load existing edges into graph
        this.loadGraphFromDB();
    }
    loadGraphFromDB() {
        try {
            const edges = this.db.getAllEdges();
            this.graph.addEdges(edges);
            this.telemetry.log('debug', 'api.graph_loaded', { edgeCount: edges.length });
        }
        catch {
            // DB might be empty
        }
    }
    async indexRepository(repoPath) {
        const absPath = path_1.default.resolve(repoPath);
        return Promise.resolve(this.indexer.indexRepository(absPath));
    }
    async updateFile(filePath) {
        const absPath = path_1.default.resolve(filePath);
        this.indexer.updateFile(absPath);
        // Refresh retrieval graph after update
        this.retrieval.refreshGraph();
    }
    findRelevant(query, limit = 10) {
        return this.retrieval.findRelevant(query, limit);
    }
    getContext(task) {
        const { symbols, chunks } = this.retrieval.queryContext(task);
        // Fetch claims for all symbols
        const claims = [];
        for (const sym of symbols) {
            const symClaims = this.claimsEngine.getClaimsForSymbol(sym.id);
            claims.push(...symClaims);
        }
        return { symbols, chunks, claims };
    }
    getSymbol(name) {
        return this.retrieval.getSymbol(name);
    }
    getGraph() {
        const nodes = this.db.getAllSymbols();
        const edges = this.db.getAllEdges();
        return { nodes, edges };
    }
    startWatching(repoPath, glob) {
        const absPath = path_1.default.resolve(repoPath);
        this.watcher.start(absPath, glob);
    }
    stopWatching() {
        this.watcher.stop();
    }
    getStats() {
        return this.indexer.getStats();
    }
    // Additional useful methods
    getSymbolById(id) {
        return this.retrieval.getSymbolById(id);
    }
    getDependencies(id, depth) {
        return this.retrieval.getDependencies(id, depth);
    }
    getDependents(id, depth) {
        return this.retrieval.getDependents(id, depth);
    }
    getClaims(symbolId) {
        return this.claimsEngine.getClaimsForSymbol(symbolId);
    }
    onWatchEvent(handler) {
        this.watcher.onEvent(handler);
    }
    async invalidate(filePath) {
        const absPath = path_1.default.resolve(filePath);
        const symbols = this.db.getSymbolsByFile(absPath);
        const symbolIds = symbols.map(s => s.id);
        return Promise.resolve(this.invalidationEngine.propagate({
            filePath: absPath,
            symbolIds,
            timestamp: Date.now(),
            reason: 'manual',
        }));
    }
    getSessionManager() {
        return this.sessionManager;
    }
    createSession() {
        return this.sessionManager.createSession();
    }
    detectContradictions(symbolId) {
        let claims;
        if (symbolId) {
            claims = this.claimsEngine.getClaimsForSymbol(symbolId);
        }
        else {
            // Get claims for all symbols
            const symbols = this.db.getAllSymbols();
            claims = symbols.flatMap(s => this.claimsEngine.getClaimsForSymbol(s.id));
        }
        return this.contradictionDetector.detect(claims);
    }
    close() {
        this.watcher.stop();
        this.db.close();
    }
}
exports.CodeBrain = CodeBrain;
//# sourceMappingURL=api.js.map