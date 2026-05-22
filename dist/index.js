"use strict";
// Main entry point and public API exports
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = exports.SemanticReplayStore = exports.RuntimeReplayStore = exports.ReplayLogStore = exports.isTruthLevelAtLeast = exports.RuntimeAwareRiskAssessor = exports.createExecutionContext = exports.OperationRegistry = exports.SemanticExecutor = exports.SemanticReplayLog = exports.SemanticDiffEngine = exports.PERMISSIVE_TRUST_POLICY = exports.CONSERVATIVE_TRUST_POLICY = exports.DEFAULT_TRUST_POLICY = exports.TrustEvaluator = exports.RiskAssessmentEngine = exports.ValidationPipeline = exports.TransformationEngine = exports.ASTSerializer = exports.ASTTransformer = exports.SemanticIR = exports.RetrievalValidator = exports.ReplayLog = exports.RollbackManager = exports.CognitiveTransaction = exports.TransactionCoordinator = exports.computeEntropyMetrics = exports.ContradictionDetector = exports.InvalidationEngine = exports.applySessionBias = exports.SessionManager = exports.chunkSymbols = exports.chunkSymbol = exports.makeContentHash = exports.makeSymbolId = exports.extractEdges = exports.extractSymbols = exports.isSupportedFile = exports.parseSource = exports.parseFile = exports.Telemetry = exports.Watcher = exports.Retrieval = exports.Indexer = exports.ClaimsEngine = exports.DependencyGraph = exports.Embedder = exports.DB = exports.TruthLevel = exports.CodeBrain = void 0;
exports.SuccessPatternMemory = exports.FailureLearning = exports.RuntimeLearningEngine = exports.computeDecayScore = exports.summarizeCluster = exports.MemoryCompactor = exports.ConsolidationEngine = exports.CalibrationStore = exports.FailureMemoryStore = void 0;
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
var index_js_2 = require("./transactions/index.js");
Object.defineProperty(exports, "TransactionCoordinator", { enumerable: true, get: function () { return index_js_2.TransactionCoordinator; } });
Object.defineProperty(exports, "CognitiveTransaction", { enumerable: true, get: function () { return index_js_2.CognitiveTransaction; } });
Object.defineProperty(exports, "RollbackManager", { enumerable: true, get: function () { return index_js_2.RollbackManager; } });
var index_js_3 = require("./replay/index.js");
Object.defineProperty(exports, "ReplayLog", { enumerable: true, get: function () { return index_js_3.ReplayLog; } });
var index_js_4 = require("./retrieval/validation/index.js");
Object.defineProperty(exports, "RetrievalValidator", { enumerable: true, get: function () { return index_js_4.RetrievalValidator; } });
var index_js_5 = require("./semantic-ir/index.js");
Object.defineProperty(exports, "SemanticIR", { enumerable: true, get: function () { return index_js_5.SemanticIR; } });
// v2.0 — Semantic Execution Phase
var index_js_6 = require("./ast-runtime/index.js");
Object.defineProperty(exports, "ASTTransformer", { enumerable: true, get: function () { return index_js_6.ASTTransformer; } });
Object.defineProperty(exports, "ASTSerializer", { enumerable: true, get: function () { return index_js_6.ASTSerializer; } });
Object.defineProperty(exports, "TransformationEngine", { enumerable: true, get: function () { return index_js_6.TransformationEngine; } });
var index_js_7 = require("./validation/index.js");
Object.defineProperty(exports, "ValidationPipeline", { enumerable: true, get: function () { return index_js_7.ValidationPipeline; } });
var index_js_8 = require("./risk/index.js");
Object.defineProperty(exports, "RiskAssessmentEngine", { enumerable: true, get: function () { return index_js_8.RiskAssessmentEngine; } });
var index_js_9 = require("./trust/index.js");
Object.defineProperty(exports, "TrustEvaluator", { enumerable: true, get: function () { return index_js_9.TrustEvaluator; } });
Object.defineProperty(exports, "DEFAULT_TRUST_POLICY", { enumerable: true, get: function () { return index_js_9.DEFAULT_TRUST_POLICY; } });
Object.defineProperty(exports, "CONSERVATIVE_TRUST_POLICY", { enumerable: true, get: function () { return index_js_9.CONSERVATIVE_TRUST_POLICY; } });
Object.defineProperty(exports, "PERMISSIVE_TRUST_POLICY", { enumerable: true, get: function () { return index_js_9.PERMISSIVE_TRUST_POLICY; } });
var index_js_10 = require("./semantic-diff/index.js");
Object.defineProperty(exports, "SemanticDiffEngine", { enumerable: true, get: function () { return index_js_10.SemanticDiffEngine; } });
var index_js_11 = require("./semantic-replay/index.js");
Object.defineProperty(exports, "SemanticReplayLog", { enumerable: true, get: function () { return index_js_11.SemanticReplayLog; } });
var index_js_12 = require("./semantic-execution/index.js");
Object.defineProperty(exports, "SemanticExecutor", { enumerable: true, get: function () { return index_js_12.SemanticExecutor; } });
Object.defineProperty(exports, "OperationRegistry", { enumerable: true, get: function () { return index_js_12.OperationRegistry; } });
Object.defineProperty(exports, "createExecutionContext", { enumerable: true, get: function () { return index_js_12.createExecutionContext; } });
// v2.5 — Runtime Awareness Phase
__exportStar(require("./runtime-awareness/index.js"), exports);
__exportStar(require("./outcomes/index.js"), exports);
__exportStar(require("./runtime-validation/index.js"), exports);
__exportStar(require("./calibration/index.js"), exports);
__exportStar(require("./failure-memory/index.js"), exports);
var RuntimeAwareRiskAssessor_js_1 = require("./risk/RuntimeAwareRiskAssessor.js");
Object.defineProperty(exports, "RuntimeAwareRiskAssessor", { enumerable: true, get: function () { return RuntimeAwareRiskAssessor_js_1.RuntimeAwareRiskAssessor; } });
__exportStar(require("./runtime-replay/index.js"), exports);
// v3.0 — Persistent Cognitive Memory Phase
var retrieval_js_2 = require("./retrieval/retrieval.js");
Object.defineProperty(exports, "isTruthLevelAtLeast", { enumerable: true, get: function () { return retrieval_js_2.isTruthLevelAtLeast; } });
var ReplayLogStore_js_1 = require("./persistence/replay/ReplayLogStore.js");
Object.defineProperty(exports, "ReplayLogStore", { enumerable: true, get: function () { return ReplayLogStore_js_1.ReplayLogStore; } });
var RuntimeReplayStore_js_1 = require("./persistence/replay/RuntimeReplayStore.js");
Object.defineProperty(exports, "RuntimeReplayStore", { enumerable: true, get: function () { return RuntimeReplayStore_js_1.RuntimeReplayStore; } });
var SemanticReplayStore_js_1 = require("./persistence/replay/SemanticReplayStore.js");
Object.defineProperty(exports, "SemanticReplayStore", { enumerable: true, get: function () { return SemanticReplayStore_js_1.SemanticReplayStore; } });
var SessionStore_js_1 = require("./persistence/sessions/SessionStore.js");
Object.defineProperty(exports, "SessionStore", { enumerable: true, get: function () { return SessionStore_js_1.SessionStore; } });
var FailureMemoryStore_js_1 = require("./persistence/failure-memory/FailureMemoryStore.js");
Object.defineProperty(exports, "FailureMemoryStore", { enumerable: true, get: function () { return FailureMemoryStore_js_1.FailureMemoryStore; } });
var CalibrationStore_js_1 = require("./persistence/calibration/CalibrationStore.js");
Object.defineProperty(exports, "CalibrationStore", { enumerable: true, get: function () { return CalibrationStore_js_1.CalibrationStore; } });
var ConsolidationEngine_js_1 = require("./consolidation/ConsolidationEngine.js");
Object.defineProperty(exports, "ConsolidationEngine", { enumerable: true, get: function () { return ConsolidationEngine_js_1.ConsolidationEngine; } });
var MemoryCompactor_js_1 = require("./consolidation/MemoryCompactor.js");
Object.defineProperty(exports, "MemoryCompactor", { enumerable: true, get: function () { return MemoryCompactor_js_1.MemoryCompactor; } });
var SemanticSummarizer_js_1 = require("./consolidation/SemanticSummarizer.js");
Object.defineProperty(exports, "summarizeCluster", { enumerable: true, get: function () { return SemanticSummarizer_js_1.summarizeCluster; } });
var RetrievalDecay_js_1 = require("./consolidation/RetrievalDecay.js");
Object.defineProperty(exports, "computeDecayScore", { enumerable: true, get: function () { return RetrievalDecay_js_1.computeDecayScore; } });
var RuntimeLearningEngine_js_1 = require("./learning/RuntimeLearningEngine.js");
Object.defineProperty(exports, "RuntimeLearningEngine", { enumerable: true, get: function () { return RuntimeLearningEngine_js_1.RuntimeLearningEngine; } });
var FailureLearning_js_1 = require("./learning/FailureLearning.js");
Object.defineProperty(exports, "FailureLearning", { enumerable: true, get: function () { return FailureLearning_js_1.FailureLearning; } });
var SuccessPatternMemory_js_1 = require("./learning/SuccessPatternMemory.js");
Object.defineProperty(exports, "SuccessPatternMemory", { enumerable: true, get: function () { return SuccessPatternMemory_js_1.SuccessPatternMemory; } });
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