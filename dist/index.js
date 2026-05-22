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
exports.PlanningMetrics = exports.PlanningHeuristics = exports.StrategyMemory = exports.ArchitecturalInvariantChecker = exports.ConstraintEngine = exports.AutonomousExecutor = exports.CheckpointManager = exports.AdaptivePlanner = exports.PlanGenerator = exports.ExecutionGraph = exports.GoalDecomposer = exports.ReplayEngine = exports.SnapshotManager = exports.TimelineBuilder = exports.makeEventId = exports.createEvent = exports.EventStore = exports.MetricsAggregator = exports.RuntimeHealthMetrics = exports.CognitiveMetrics = exports.ProceduralMemory = exports.SemanticMemory = exports.EpisodicMemory = exports.WorkingMemory = exports.RollbackHeuristics = exports.FailureRecoveryPlanner = exports.SelfHealingEngine = exports.STRATEGIES = exports.getStrategy = exports.ModeSelector = exports.CognitiveMode = exports.LearningSignalAggregator = exports.AdaptiveRetrievalPolicy = exports.AdaptiveTrustPolicy = exports.CognitiveFeedbackLoop = exports.SuccessPatternMemory = exports.FailureLearning = exports.RuntimeLearningEngine = exports.computeDecayScore = exports.summarizeCluster = exports.MemoryCompactor = exports.ConsolidationEngine = exports.CalibrationStore = exports.FailureMemoryStore = void 0;
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
// v3.5 — Autonomous Cognitive Loop Phase
var CognitiveFeedbackLoop_js_1 = require("./cognitive-loop/CognitiveFeedbackLoop.js");
Object.defineProperty(exports, "CognitiveFeedbackLoop", { enumerable: true, get: function () { return CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop; } });
var AdaptiveTrustPolicy_js_1 = require("./cognitive-loop/AdaptiveTrustPolicy.js");
Object.defineProperty(exports, "AdaptiveTrustPolicy", { enumerable: true, get: function () { return AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy; } });
var AdaptiveRetrievalPolicy_js_1 = require("./cognitive-loop/AdaptiveRetrievalPolicy.js");
Object.defineProperty(exports, "AdaptiveRetrievalPolicy", { enumerable: true, get: function () { return AdaptiveRetrievalPolicy_js_1.AdaptiveRetrievalPolicy; } });
var LearningSignalAggregator_js_1 = require("./cognitive-loop/LearningSignalAggregator.js");
Object.defineProperty(exports, "LearningSignalAggregator", { enumerable: true, get: function () { return LearningSignalAggregator_js_1.LearningSignalAggregator; } });
var CognitiveMode_js_1 = require("./cognitive-modes/CognitiveMode.js");
Object.defineProperty(exports, "CognitiveMode", { enumerable: true, get: function () { return CognitiveMode_js_1.CognitiveMode; } });
var ModeSelector_js_1 = require("./cognitive-modes/ModeSelector.js");
Object.defineProperty(exports, "ModeSelector", { enumerable: true, get: function () { return ModeSelector_js_1.ModeSelector; } });
var ExecutionStrategy_js_1 = require("./cognitive-modes/ExecutionStrategy.js");
Object.defineProperty(exports, "getStrategy", { enumerable: true, get: function () { return ExecutionStrategy_js_1.getStrategy; } });
Object.defineProperty(exports, "STRATEGIES", { enumerable: true, get: function () { return ExecutionStrategy_js_1.STRATEGIES; } });
var SelfHealingEngine_js_1 = require("./self-healing/SelfHealingEngine.js");
Object.defineProperty(exports, "SelfHealingEngine", { enumerable: true, get: function () { return SelfHealingEngine_js_1.SelfHealingEngine; } });
var FailureRecoveryPlanner_js_1 = require("./self-healing/FailureRecoveryPlanner.js");
Object.defineProperty(exports, "FailureRecoveryPlanner", { enumerable: true, get: function () { return FailureRecoveryPlanner_js_1.FailureRecoveryPlanner; } });
var RollbackHeuristics_js_1 = require("./self-healing/RollbackHeuristics.js");
Object.defineProperty(exports, "RollbackHeuristics", { enumerable: true, get: function () { return RollbackHeuristics_js_1.RollbackHeuristics; } });
var WorkingMemory_js_1 = require("./hierarchical-memory/WorkingMemory.js");
Object.defineProperty(exports, "WorkingMemory", { enumerable: true, get: function () { return WorkingMemory_js_1.WorkingMemory; } });
var EpisodicMemory_js_1 = require("./hierarchical-memory/EpisodicMemory.js");
Object.defineProperty(exports, "EpisodicMemory", { enumerable: true, get: function () { return EpisodicMemory_js_1.EpisodicMemory; } });
var SemanticMemory_js_1 = require("./hierarchical-memory/SemanticMemory.js");
Object.defineProperty(exports, "SemanticMemory", { enumerable: true, get: function () { return SemanticMemory_js_1.SemanticMemory; } });
var ProceduralMemory_js_1 = require("./hierarchical-memory/ProceduralMemory.js");
Object.defineProperty(exports, "ProceduralMemory", { enumerable: true, get: function () { return ProceduralMemory_js_1.ProceduralMemory; } });
var CognitiveMetrics_js_1 = require("./metrics/CognitiveMetrics.js");
Object.defineProperty(exports, "CognitiveMetrics", { enumerable: true, get: function () { return CognitiveMetrics_js_1.CognitiveMetrics; } });
var RuntimeHealthMetrics_js_1 = require("./metrics/RuntimeHealthMetrics.js");
Object.defineProperty(exports, "RuntimeHealthMetrics", { enumerable: true, get: function () { return RuntimeHealthMetrics_js_1.RuntimeHealthMetrics; } });
var MetricsAggregator_js_1 = require("./metrics/MetricsAggregator.js");
Object.defineProperty(exports, "MetricsAggregator", { enumerable: true, get: function () { return MetricsAggregator_js_1.MetricsAggregator; } });
// v4.5 — Event-Sourced Cognitive Runtime
var EventStore_js_1 = require("./event-store/EventStore.js");
Object.defineProperty(exports, "EventStore", { enumerable: true, get: function () { return EventStore_js_1.EventStore; } });
var CognitiveEvent_js_1 = require("./event-store/CognitiveEvent.js");
Object.defineProperty(exports, "createEvent", { enumerable: true, get: function () { return CognitiveEvent_js_1.createEvent; } });
Object.defineProperty(exports, "makeEventId", { enumerable: true, get: function () { return CognitiveEvent_js_1.makeEventId; } });
var ExecutionTimeline_js_1 = require("./event-store/ExecutionTimeline.js");
Object.defineProperty(exports, "TimelineBuilder", { enumerable: true, get: function () { return ExecutionTimeline_js_1.TimelineBuilder; } });
var SnapshotManager_js_1 = require("./event-store/SnapshotManager.js");
Object.defineProperty(exports, "SnapshotManager", { enumerable: true, get: function () { return SnapshotManager_js_1.SnapshotManager; } });
var ReplayEngine_js_1 = require("./event-store/ReplayEngine.js");
Object.defineProperty(exports, "ReplayEngine", { enumerable: true, get: function () { return ReplayEngine_js_1.ReplayEngine; } });
var GoalDecomposer_js_1 = require("./goals/GoalDecomposer.js");
Object.defineProperty(exports, "GoalDecomposer", { enumerable: true, get: function () { return GoalDecomposer_js_1.GoalDecomposer; } });
var ExecutionGraph_js_1 = require("./planning/ExecutionGraph.js");
Object.defineProperty(exports, "ExecutionGraph", { enumerable: true, get: function () { return ExecutionGraph_js_1.ExecutionGraph; } });
var PlanGenerator_js_1 = require("./planning/PlanGenerator.js");
Object.defineProperty(exports, "PlanGenerator", { enumerable: true, get: function () { return PlanGenerator_js_1.PlanGenerator; } });
var AdaptivePlanner_js_1 = require("./planning/AdaptivePlanner.js");
Object.defineProperty(exports, "AdaptivePlanner", { enumerable: true, get: function () { return AdaptivePlanner_js_1.AdaptivePlanner; } });
var ExecutionCheckpoint_js_1 = require("./autonomous-execution/ExecutionCheckpoint.js");
Object.defineProperty(exports, "CheckpointManager", { enumerable: true, get: function () { return ExecutionCheckpoint_js_1.CheckpointManager; } });
var AutonomousExecutor_js_1 = require("./autonomous-execution/AutonomousExecutor.js");
Object.defineProperty(exports, "AutonomousExecutor", { enumerable: true, get: function () { return AutonomousExecutor_js_1.AutonomousExecutor; } });
var ConstraintEngine_js_1 = require("./constraints/ConstraintEngine.js");
Object.defineProperty(exports, "ConstraintEngine", { enumerable: true, get: function () { return ConstraintEngine_js_1.ConstraintEngine; } });
var ArchitecturalInvariant_js_1 = require("./constraints/ArchitecturalInvariant.js");
Object.defineProperty(exports, "ArchitecturalInvariantChecker", { enumerable: true, get: function () { return ArchitecturalInvariant_js_1.ArchitecturalInvariantChecker; } });
var StrategyMemory_js_1 = require("./strategic-memory/StrategyMemory.js");
Object.defineProperty(exports, "StrategyMemory", { enumerable: true, get: function () { return StrategyMemory_js_1.StrategyMemory; } });
var PlanningHeuristics_js_1 = require("./strategic-memory/PlanningHeuristics.js");
Object.defineProperty(exports, "PlanningHeuristics", { enumerable: true, get: function () { return PlanningHeuristics_js_1.PlanningHeuristics; } });
var PlanningMetrics_js_1 = require("./planning-metrics/PlanningMetrics.js");
Object.defineProperty(exports, "PlanningMetrics", { enumerable: true, get: function () { return PlanningMetrics_js_1.PlanningMetrics; } });
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