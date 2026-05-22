// Main entry point and public API exports

export { CodeBrain } from './api/api.js';
export type {
  SymbolNode,
  SymbolKind,
  SemanticChunk,
  Claim,
  DependencyEdge,
  IndexStats,
  ParsedFile,
  RawSymbol,
  RawImport,
  CodeBrainConfig,
  RetrievalResult,
  RetrievalTrace,
  RetrievalReason,
  ContextEntropyMetrics,
} from './types/index.js';
export { TruthLevel } from './types/index.js';

export { DB } from './persistence/db.js';
export { Embedder } from './embeddings/embedder.js';
export { DependencyGraph } from './graph/dependency-graph.js';
export { ClaimsEngine } from './claims/claims-engine.js';
export { Indexer } from './indexer/indexer.js';
export { Retrieval } from './retrieval/retrieval.js';
export { Watcher } from './watcher/watcher.js';
export { Telemetry } from './telemetry/telemetry.js';
export { parseFile, parseSource, isSupportedFile } from './parser/ast.js';
export { extractSymbols, extractEdges, makeSymbolId, makeContentHash } from './parser/extractor.js';
export { chunkSymbol, chunkSymbols } from './chunks/chunker.js';
export { SessionManager } from './session/SessionContext.js';
export type { SessionContext, SessionEntry } from './session/SessionContext.js';
export { applySessionBias } from './session/SessionBias.js';
export { InvalidationEngine } from './invalidation/InvalidationEngine.js';
export type { InvalidationEvent, InvalidationResult } from './invalidation/InvalidationEngine.js';
export { ContradictionDetector } from './contradictions/ContradictionDetector.js';
export type { Contradiction, ContradictionReport, ContradictionKind, ContradictionSeverity } from './contradictions/types.js';
export { computeEntropyMetrics } from './retrieval/entropy.js';
export { TransactionCoordinator, CognitiveTransaction, RollbackManager } from './transactions/index.js';
export type { TransactionResult, TransactionOperation, RollbackRecord } from './transactions/index.js';
export { ReplayLog } from './replay/index.js';
export type { CognitiveReplayEvent, ReplayEventType } from './replay/index.js';
export { RetrievalValidator } from './retrieval/validation/index.js';
export type { RetrievalValidationResult } from './retrieval/validation/index.js';
export { SemanticIR } from './semantic-ir/index.js';
export type { SemanticOperation, SemanticTransformation, SemanticOperationType } from './semantic-ir/index.js';

// v2.0 — Semantic Execution Phase
export { ASTTransformer, ASTSerializer, TransformationEngine } from './ast-runtime/index.js';
export type { ASTMutation, FileMutations, TransformResult, EngineContext, SerializedOutput } from './ast-runtime/index.js';

export { ValidationPipeline } from './validation/index.js';
export type { ValidationResult, ValidationCheck, ValidationCheckResult, ValidationContext } from './validation/index.js';

export { RiskAssessmentEngine } from './risk/index.js';
export type { RiskAssessment, RiskLevel } from './risk/index.js';

export { TrustEvaluator, DEFAULT_TRUST_POLICY, CONSERVATIVE_TRUST_POLICY, PERMISSIVE_TRUST_POLICY } from './trust/index.js';
export type { TrustPolicy, TrustDecision, ApprovalMode } from './trust/index.js';

export { SemanticDiffEngine } from './semantic-diff/index.js';
export type { SemanticDiff, OperationDiff, ImpactSummary } from './semantic-diff/index.js';

export { SemanticReplayLog } from './semantic-replay/index.js';
export type { SemanticReplayEvent, SemanticReplayFilter } from './semantic-replay/index.js';

export { SemanticExecutor, OperationRegistry, createExecutionContext } from './semantic-execution/index.js';
export type { ExecutionContext, ExecutionPlan, ExecutionStep, ExecutionResult, OperationHandler, CognitiveConfig, CognitiveExecutionResult, CognitiveLoopData } from './semantic-execution/index.js';

// v2.5 — Runtime Awareness Phase
export * from './runtime-awareness/index.js';
export * from './outcomes/index.js';
export * from './runtime-validation/index.js';
export * from './calibration/index.js';
export * from './failure-memory/index.js';
export { RuntimeAwareRiskAssessor } from './risk/RuntimeAwareRiskAssessor.js';
export type { RuntimeRiskContext, RuntimeAwareRiskAssessment } from './risk/RuntimeAwareRiskAssessor.js';
export * from './runtime-replay/index.js';

// v3.0 — Persistent Cognitive Memory Phase
export { isTruthLevelAtLeast, type RetrievalFilteringStats, type FilteredRetrievalResult } from './retrieval/retrieval.js';
export { ReplayLogStore } from './persistence/replay/ReplayLogStore.js';
export { RuntimeReplayStore } from './persistence/replay/RuntimeReplayStore.js';
export { SemanticReplayStore, type SemanticReplayRecord } from './persistence/replay/SemanticReplayStore.js';
export { SessionStore } from './persistence/sessions/SessionStore.js';
export { FailureMemoryStore } from './persistence/failure-memory/FailureMemoryStore.js';
export { CalibrationStore, type CalibrationRecord } from './persistence/calibration/CalibrationStore.js';
export { ConsolidationEngine, type ConsolidationResult } from './consolidation/ConsolidationEngine.js';
export { MemoryCompactor, type CompactionResult } from './consolidation/MemoryCompactor.js';
export { summarizeCluster, type SemanticSummary } from './consolidation/SemanticSummarizer.js';
export { computeDecayScore, type RetrievalDecayScore, type DecayInput } from './consolidation/RetrievalDecay.js';
export { RuntimeLearningEngine, type LearningResult } from './learning/RuntimeLearningEngine.js';
export { FailureLearning, type FailureLearningResult } from './learning/FailureLearning.js';
export { SuccessPatternMemory, type SuccessPattern } from './learning/SuccessPatternMemory.js';

// v3.5 — Autonomous Cognitive Loop Phase
export { CognitiveFeedbackLoop, type FeedbackLoopSummary } from './cognitive-loop/CognitiveFeedbackLoop.js';
export { AdaptiveTrustPolicy, type AdaptiveTrustState } from './cognitive-loop/AdaptiveTrustPolicy.js';
export { AdaptiveRetrievalPolicy, type RetrievalReliabilitySignal } from './cognitive-loop/AdaptiveRetrievalPolicy.js';
export { LearningSignalAggregator, type AggregatedLearningSignal } from './cognitive-loop/LearningSignalAggregator.js';
export { CognitiveMode } from './cognitive-modes/CognitiveMode.js';
export { ModeSelector, type ModeSelectorContext } from './cognitive-modes/ModeSelector.js';
export { getStrategy, STRATEGIES, type ExecutionStrategy } from './cognitive-modes/ExecutionStrategy.js';
export { SelfHealingEngine, type HealingAttempt } from './self-healing/SelfHealingEngine.js';
export { FailureRecoveryPlanner, type RecoveryPlan, type RecoveryStrategy } from './self-healing/FailureRecoveryPlanner.js';
export { RollbackHeuristics, type RollbackDecision, type RollbackScope } from './self-healing/RollbackHeuristics.js';
export { WorkingMemory, type WorkingMemorySnapshot } from './hierarchical-memory/WorkingMemory.js';
export { EpisodicMemory, type Episode, type EpisodeType } from './hierarchical-memory/EpisodicMemory.js';
export { SemanticMemory, type SemanticFact } from './hierarchical-memory/SemanticMemory.js';
export { ProceduralMemory, type ProceduralPattern } from './hierarchical-memory/ProceduralMemory.js';
export { CognitiveMetrics, type CognitiveMetricsSnapshot, type CognitiveHealthSnapshot } from './metrics/CognitiveMetrics.js';
export { RuntimeHealthMetrics, type RuntimeHealthReport } from './metrics/RuntimeHealthMetrics.js';
export { MetricsAggregator } from './metrics/MetricsAggregator.js';

// v4.5 — Event-Sourced Cognitive Runtime
export { EventStore, type EventFilter, type EventStoreSnapshot } from './event-store/EventStore.js';
export { type CognitiveEvent, type CognitiveEventType, createEvent, makeEventId } from './event-store/CognitiveEvent.js';
export type {
  GoalCreatedEvent,
  PlanGeneratedEvent,
  StepExecutedEvent,
  RuntimeValidatedEvent,
  LearningObservedEvent,
  RecoveryTriggeredEvent,
  RollbackAppliedEvent,
  ConstraintViolationEvent,
  ModeSwitchedEvent,
} from './event-store/CognitiveEvent.js';
export {
  TimelineBuilder,
  type ExecutionTimeline,
  type TimelineNode,
  type CriticalMoment,
  type ModeTransition,
} from './event-store/ExecutionTimeline.js';
export {
  SnapshotManager,
  type CognitiveSnapshot,
  type MemorySnapshot,
  type TrustSnapshot,
  type SnapshotSource,
} from './event-store/SnapshotManager.js';
export { ReplayEngine, type ReplayResult, type DryReplayResult, type EventHandler } from './event-store/ReplayEngine.js';

// v4.0 — Goal-Oriented Autonomous Planning Phase
export type { Goal, GoalType, GoalPriority, GoalStatus, GoalConstraint, AcceptanceCriterion, GoalResult } from './goals/Goal.js';
export { GoalDecomposer } from './goals/GoalDecomposer.js';
export { ExecutionGraph } from './planning/ExecutionGraph.js';
export type { ExecutionNode, ExecutionEdge } from './planning/ExecutionGraph.js';
export { PlanGenerator } from './planning/PlanGenerator.js';
export type { ExecutionStep as GoalExecutionStep, ExecutionPlan as GoalExecutionPlan } from './planning/PlanGenerator.js';
export { AdaptivePlanner } from './planning/AdaptivePlanner.js';
export { CheckpointManager } from './autonomous-execution/ExecutionCheckpoint.js';
export type { RollbackPoint, ExecutionState, Checkpoint } from './autonomous-execution/ExecutionCheckpoint.js';
export { AutonomousExecutor } from './autonomous-execution/AutonomousExecutor.js';
export type { ExecutorEvent } from './autonomous-execution/AutonomousExecutor.js';
export { ConstraintEngine } from './constraints/ConstraintEngine.js';
export type { ConstraintViolation } from './constraints/ConstraintEngine.js';
export { ArchitecturalInvariantChecker } from './constraints/ArchitecturalInvariant.js';
export type { Invariant } from './constraints/ArchitecturalInvariant.js';
export { StrategyMemory } from './strategic-memory/StrategyMemory.js';
export type { StrategyRecord } from './strategic-memory/StrategyMemory.js';
export { PlanningHeuristics } from './strategic-memory/PlanningHeuristics.js';
export { PlanningMetrics } from './planning-metrics/PlanningMetrics.js';
export type { PlanMetricRecord } from './planning-metrics/PlanningMetrics.js';

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
