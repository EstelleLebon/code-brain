"use strict";
// Main entry point and public API exports
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEntropyMetrics = exports.ContradictionDetector = exports.InvalidationEngine = exports.applySessionBias = exports.SessionManager = exports.chunkSymbols = exports.chunkSymbol = exports.makeContentHash = exports.makeSymbolId = exports.extractEdges = exports.extractSymbols = exports.isSupportedFile = exports.parseSource = exports.parseFile = exports.Telemetry = exports.Watcher = exports.Retrieval = exports.Indexer = exports.ClaimsEngine = exports.DependencyGraph = exports.Embedder = exports.DB = exports.TruthLevel = exports.CodeBrain = void 0;
var api_js_1 = require("./api/api.js");
Object.defineProperty(exports, "CodeBrain", { enumerable: true, get: function () { return api_js_1.CodeBrain; } });
var index_js_1 = require("./types/index.js");
Object.defineProperty(exports, "TruthLevel", { enumerable: true, get: function () { return index_js_1.TruthLevel; } });
var db_js_1 = require("./persistence/db.js");
Object.defineProperty(exports, "DB", { enumerable: true, get: function () { return db_js_1.DB; } });
var embedder_js_1 = require("./embeddings/embedder.js");
Object.defineProperty(exports, "Embedder", { enumerable: true, get: function () { return embedder_js_1.Embedder; } });
var dependency_graph_js_1 = require("./graph/dependency-graph.js");
Object.defineProperty(exports, "DependencyGraph", { enumerable: true, get: function () { return dependency_graph_js_1.DependencyGraph; } });
var claims_engine_js_1 = require("./claims/claims-engine.js");
Object.defineProperty(exports, "ClaimsEngine", { enumerable: true, get: function () { return claims_engine_js_1.ClaimsEngine; } });
var indexer_js_1 = require("./indexer/indexer.js");
Object.defineProperty(exports, "Indexer", { enumerable: true, get: function () { return indexer_js_1.Indexer; } });
var retrieval_js_1 = require("./retrieval/retrieval.js");
Object.defineProperty(exports, "Retrieval", { enumerable: true, get: function () { return retrieval_js_1.Retrieval; } });
var watcher_js_1 = require("./watcher/watcher.js");
Object.defineProperty(exports, "Watcher", { enumerable: true, get: function () { return watcher_js_1.Watcher; } });
var telemetry_js_1 = require("./telemetry/telemetry.js");
Object.defineProperty(exports, "Telemetry", { enumerable: true, get: function () { return telemetry_js_1.Telemetry; } });
var ast_js_1 = require("./parser/ast.js");
Object.defineProperty(exports, "parseFile", { enumerable: true, get: function () { return ast_js_1.parseFile; } });
Object.defineProperty(exports, "parseSource", { enumerable: true, get: function () { return ast_js_1.parseSource; } });
Object.defineProperty(exports, "isSupportedFile", { enumerable: true, get: function () { return ast_js_1.isSupportedFile; } });
var extractor_js_1 = require("./parser/extractor.js");
Object.defineProperty(exports, "extractSymbols", { enumerable: true, get: function () { return extractor_js_1.extractSymbols; } });
Object.defineProperty(exports, "extractEdges", { enumerable: true, get: function () { return extractor_js_1.extractEdges; } });
Object.defineProperty(exports, "makeSymbolId", { enumerable: true, get: function () { return extractor_js_1.makeSymbolId; } });
Object.defineProperty(exports, "makeContentHash", { enumerable: true, get: function () { return extractor_js_1.makeContentHash; } });
var chunker_js_1 = require("./chunks/chunker.js");
Object.defineProperty(exports, "chunkSymbol", { enumerable: true, get: function () { return chunker_js_1.chunkSymbol; } });
Object.defineProperty(exports, "chunkSymbols", { enumerable: true, get: function () { return chunker_js_1.chunkSymbols; } });
var SessionContext_js_1 = require("./session/SessionContext.js");
Object.defineProperty(exports, "SessionManager", { enumerable: true, get: function () { return SessionContext_js_1.SessionManager; } });
var SessionBias_js_1 = require("./session/SessionBias.js");
Object.defineProperty(exports, "applySessionBias", { enumerable: true, get: function () { return SessionBias_js_1.applySessionBias; } });
var InvalidationEngine_js_1 = require("./invalidation/InvalidationEngine.js");
Object.defineProperty(exports, "InvalidationEngine", { enumerable: true, get: function () { return InvalidationEngine_js_1.InvalidationEngine; } });
var ContradictionDetector_js_1 = require("./contradictions/ContradictionDetector.js");
Object.defineProperty(exports, "ContradictionDetector", { enumerable: true, get: function () { return ContradictionDetector_js_1.ContradictionDetector; } });
var entropy_js_1 = require("./retrieval/entropy.js");
Object.defineProperty(exports, "computeEntropyMetrics", { enumerable: true, get: function () { return entropy_js_1.computeEntropyMetrics; } });
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
//# sourceMappingURL=index.js.map