import path from 'path';
import os from 'os';
import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { ClaimsEngine } from '../claims/claims-engine.js';
import { Indexer } from '../indexer/indexer.js';
import { Retrieval } from '../retrieval/retrieval.js';
import { Watcher } from '../watcher/watcher.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { InvalidationEngine, InvalidationResult } from '../invalidation/InvalidationEngine.js';
import { SessionManager } from '../session/SessionContext.js';
import { ContradictionDetector } from '../contradictions/ContradictionDetector.js';
import { Contradiction } from '../contradictions/types.js';
import {
  SymbolNode, SemanticChunk, Claim, DependencyEdge, IndexStats, CodeBrainConfig,
  RetrievalResult
} from '../types/index.js';
import { CognitiveFeedbackLoop } from '../cognitive-loop/CognitiveFeedbackLoop.js';
import { ModeSelector } from '../cognitive-modes/ModeSelector.js';
import { SelfHealingEngine } from '../self-healing/SelfHealingEngine.js';
import { MetricsAggregator } from '../metrics/MetricsAggregator.js';
import { WorkingMemory } from '../hierarchical-memory/WorkingMemory.js';
import { EpisodicMemory } from '../hierarchical-memory/EpisodicMemory.js';
import { SemanticMemory } from '../hierarchical-memory/SemanticMemory.js';
import { ProceduralMemory } from '../hierarchical-memory/ProceduralMemory.js';
import { type CognitiveHealthSnapshot } from '../metrics/CognitiveMetrics.js';
import { Goal, GoalType, GoalResult } from '../goals/Goal.js';
import { GoalDecomposer } from '../goals/GoalDecomposer.js';
import { PlanGenerator, ExecutionPlan } from '../planning/PlanGenerator.js';
import { AdaptivePlanner } from '../planning/AdaptivePlanner.js';
import { ExecutionGraph } from '../planning/ExecutionGraph.js';
import { CheckpointManager } from '../autonomous-execution/ExecutionCheckpoint.js';
import { AutonomousExecutor } from '../autonomous-execution/AutonomousExecutor.js';
import { PlanningMetrics } from '../planning-metrics/PlanningMetrics.js';
import { EventStore } from '../event-store/EventStore.js';
import { SnapshotManager, type CognitiveSnapshot, type SnapshotSource, type TrustSnapshot } from '../event-store/SnapshotManager.js';
import { ReplayEngine, type ReplayResult } from '../event-store/ReplayEngine.js';
import { TimelineBuilder, type ExecutionTimeline } from '../event-store/ExecutionTimeline.js';
import { FaultInjector } from '../stress-testing/FaultInjection.js';
import { StressRunner, type StressReport } from '../stress-testing/StressRunner.js';
import { StressScenario } from '../stress-testing/StressScenario.js';
import { ReliabilityMetrics, type ReliabilitySnapshot } from '../reliability/ReliabilityMetrics.js';
import { StabilityAnalyzer, type StabilityReport } from '../reliability/StabilityAnalyzer.js';
import { RecoveryEvaluator } from '../reliability/RecoveryEvaluator.js';
import { ChaosEngine } from '../chaos-engineering/ChaosEngine.js';
import { type ChaosPolicyLevel } from '../chaos-engineering/ChaosPolicy.js';
import { DeterminismValidator, type DeterminismReport } from '../reproducibility/DeterminismValidator.js';

export class CodeBrain {
  private db: DB;
  private embedder: Embedder;
  private graph: DependencyGraph;
  private claimsEngine: ClaimsEngine;
  private indexer: Indexer;
  private retrieval: Retrieval;
  private watcher: Watcher;
  private telemetry: Telemetry;
  private invalidationEngine: InvalidationEngine;
  private sessionManager: SessionManager;
  private contradictionDetector: ContradictionDetector;

  // v3.5 — Autonomous Cognitive Loop subsystems
  readonly feedbackLoop: CognitiveFeedbackLoop;
  readonly modeSelector: ModeSelector;
  readonly selfHealingEngine: SelfHealingEngine;
  readonly metricsAggregator: MetricsAggregator;
  readonly workingMemory: WorkingMemory;
  readonly episodicMemory: EpisodicMemory;
  readonly semanticMemory: SemanticMemory;
  readonly proceduralMemory: ProceduralMemory;

  constructor(config: CodeBrainConfig = {}) {
    const dbPath = config.dbPath ?? path.join(os.homedir(), '.code-brain', 'index.db');
    const telemetryEnabled = config.telemetry !== false;

    this.telemetry = new Telemetry(telemetryEnabled);
    this.db = new DB(dbPath);
    this.graph = new DependencyGraph();
    this.embedder = new Embedder(this.db, this.telemetry, config.maxVocabSize ?? 512);
    this.claimsEngine = new ClaimsEngine(this.db, this.graph);
    this.indexer = new Indexer(
      this.db,
      this.embedder,
      this.claimsEngine,
      this.graph,
      this.telemetry
    );
    this.sessionManager = new SessionManager();
    this.retrieval = new Retrieval(this.db, this.embedder, this.graph, this.telemetry, this.sessionManager);
    this.watcher = new Watcher(this.indexer, this.embedder, this.telemetry);
    this.invalidationEngine = new InvalidationEngine(this.db, this.graph, this.telemetry);
    this.contradictionDetector = new ContradictionDetector();

    // v3.5 — instantiate autonomous cognitive loop subsystems
    this.feedbackLoop = new CognitiveFeedbackLoop();
    this.modeSelector = new ModeSelector();
    this.selfHealingEngine = new SelfHealingEngine();
    this.metricsAggregator = new MetricsAggregator();
    const sessionId = this.sessionManager.createSession();
    this.workingMemory = new WorkingMemory(sessionId);
    this.episodicMemory = new EpisodicMemory();
    this.semanticMemory = new SemanticMemory();
    this.proceduralMemory = new ProceduralMemory();

    // Load existing edges into graph
    this.loadGraphFromDB();
  }

  private loadGraphFromDB(): void {
    try {
      const edges = this.db.getAllEdges();
      this.graph.addEdges(edges);
      this.telemetry.log('debug', 'api.graph_loaded', { edgeCount: edges.length });
    } catch {
      // DB might be empty
    }
  }

  async indexRepository(repoPath: string): Promise<IndexStats> {
    const absPath = path.resolve(repoPath);
    return Promise.resolve(this.indexer.indexRepository(absPath));
  }

  async updateFile(filePath: string): Promise<void> {
    const absPath = path.resolve(filePath);
    this.indexer.updateFile(absPath);
    // Refresh retrieval graph after update
    this.retrieval.refreshGraph();
  }

  findRelevant(query: string, limit = 10): RetrievalResult[] {
    return this.retrieval.findRelevant(query, limit);
  }

  getContext(task: string): { symbols: SymbolNode[]; chunks: SemanticChunk[]; claims: Claim[] } {
    const { symbols, chunks } = this.retrieval.queryContext(task);

    // Fetch claims for all symbols
    const claims: Claim[] = [];
    for (const sym of symbols) {
      const symClaims = this.claimsEngine.getClaimsForSymbol(sym.id);
      claims.push(...symClaims);
    }

    return { symbols, chunks, claims };
  }

  getSymbol(name: string): SymbolNode | null {
    return this.retrieval.getSymbol(name);
  }

  getGraph(): { nodes: SymbolNode[]; edges: DependencyEdge[] } {
    const nodes = this.db.getAllSymbols();
    const edges = this.db.getAllEdges();
    return { nodes, edges };
  }

  startWatching(repoPath: string, glob?: string): void {
    const absPath = path.resolve(repoPath);
    this.watcher.start(absPath, glob);
  }

  stopWatching(): void {
    this.watcher.stop();
  }

  getStats(): IndexStats {
    return this.indexer.getStats();
  }

  // Additional useful methods
  getSymbolById(id: string): SymbolNode | null {
    return this.retrieval.getSymbolById(id);
  }

  getDependencies(id: string, depth?: number): SymbolNode[] {
    return this.retrieval.getDependencies(id, depth);
  }

  getDependents(id: string, depth?: number): SymbolNode[] {
    return this.retrieval.getDependents(id, depth);
  }

  getClaims(symbolId: string): Claim[] {
    return this.claimsEngine.getClaimsForSymbol(symbolId);
  }

  onWatchEvent(handler: (data: { event: string; filePath: string; timestamp: number; changed: boolean }) => void): void {
    this.watcher.onEvent(handler);
  }

  async invalidate(filePath: string): Promise<InvalidationResult> {
    const absPath = path.resolve(filePath);
    const symbols = this.db.getSymbolsByFile(absPath);
    const symbolIds = symbols.map(s => s.id);
    return Promise.resolve(this.invalidationEngine.propagate({
      filePath: absPath,
      symbolIds,
      timestamp: Date.now(),
      reason: 'manual',
    }));
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  createSession(): string {
    return this.sessionManager.createSession();
  }

  detectContradictions(symbolId?: string): Contradiction[] {
    let claims: Claim[];
    if (symbolId) {
      claims = this.claimsEngine.getClaimsForSymbol(symbolId);
    } else {
      // Get claims for all symbols
      const symbols = this.db.getAllSymbols();
      claims = symbols.flatMap(s => this.claimsEngine.getClaimsForSymbol(s.id));
    }
    return this.contradictionDetector.detect(claims);
  }

  // ── v4.0: Goal-Oriented Autonomous Planning ──────────────────────────────────
  private _goalDecomposer = new GoalDecomposer();
  private _planGenerator = new PlanGenerator();
  private _adaptivePlanner = new AdaptivePlanner();
  private _checkpointManager = new CheckpointManager();
  private _autonomousExecutor = new AutonomousExecutor(this._adaptivePlanner, this._checkpointManager);
  private _planningMetrics = new PlanningMetrics();
  private _executionPlans = new Map<string, ExecutionPlan>();

  createGoal(description: string, type: GoalType, options: Partial<Goal> = {}): Goal {
    const id = `goal-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    const goal: Goal = {
      id,
      description,
      type,
      priority: options.priority ?? 'medium',
      constraints: options.constraints ?? {},
      acceptanceCriteria: options.acceptanceCriteria ?? [],
      createdAt: new Date(),
      status: 'pending',
      parentGoalId: options.parentGoalId,
      subGoals: options.subGoals,
      metadata: options.metadata,
    };
    return goal;
  }

  planGoal(goal: Goal): ExecutionPlan {
    const subGoals = this._goalDecomposer.decompose(goal);
    const goalWithSubs: Goal = { ...goal, subGoals };
    const plan = this._planGenerator.generate([goalWithSubs]);
    this._executionPlans.set(plan.id, plan);
    return plan;
  }

  async executeGoal(goal: Goal): Promise<GoalResult[]> {
    const plan = this.planGoal(goal);
    const results = await this._autonomousExecutor.execute(plan, { dryRun: false });
    this._planningMetrics.record({
      planId: plan.id,
      successRate: results.filter(r => r.outcome === 'success').length / Math.max(1, results.length),
      replanningCount: 0,
      avgRollbackDepth: results.reduce((s, r) => s + r.stepsRolledBack, 0) / Math.max(1, results.length),
      avgExecutionDepth: results.reduce((s, r) => s + r.stepsExecuted, 0) / Math.max(1, results.length),
      adaptiveRecoverySuccess: 1,
      plannerConfidence: 0.8,
      graphComplexity: plan.steps.length,
      timestamp: new Date(),
    });
    return results;
  }

  pauseExecution(): void {
    this._autonomousExecutor.pause();
  }

  resumeExecution(): void {
    this._autonomousExecutor.resume();
  }

  abortExecution(): void {
    this._autonomousExecutor.abort();
  }

  getExecutionGraph(planId: string): ExecutionGraph | undefined {
    return this._executionPlans.get(planId)?.graph;
  }

  getPlanningMetrics(): ReturnType<PlanningMetrics['summary']> {
    return this._planningMetrics.summary();
  }

  // ── v3.5: Cognitive health API ───────────────────────────────────────────────

  getCognitiveHealth(): CognitiveHealthSnapshot {
    const trustState = this.feedbackLoop.adaptiveTrust.getState();
    const recoverySuccessRate = this.selfHealingEngine.unresolvedCount() === 0
      ? 1
      : 1 - (this.selfHealingEngine.unresolvedCount() / Math.max(1, this.selfHealingEngine.getHistory().length));
    return this.metricsAggregator.cognitiveHealth(trustState.confidence, recoverySuccessRate);
  }

  getCognitiveSummary() {
    return this.feedbackLoop.summary();
  }

  // ── v4.5: Event-Sourced Cognitive Runtime ────────────────────────────────────
  readonly eventStore = new EventStore();
  private _snapshotManager = new SnapshotManager();
  private _replayEngine = new ReplayEngine(this.eventStore, this._snapshotManager);
  private _timelineBuilder = new TimelineBuilder();

  async replayExecution(executionId: string): Promise<ReplayResult> {
    return this._replayEngine.replay(executionId);
  }

  createCognitiveSnapshot(executionId: string, metadata: Record<string, unknown> = {}): CognitiveSnapshot {
    const source: SnapshotSource = {
      getWorkingMemoryState: () => this.workingMemory.snapshot(),
      getEpisodicMemoryState: () => this.episodicMemory.all(),
      getSemanticMemoryState: () => this.semanticMemory.all(),
      getProceduralMemoryState: () => this.proceduralMemory.all(),
      getTrustState: (): TrustSnapshot => {
        const s = this.feedbackLoop.adaptiveTrust.getState();
        return {
          successCount: s.recentSuccesses,
          failureCount: s.recentFailures,
          chunkReliability: {},
        };
      },
    };
    return this._snapshotManager.createSnapshot(executionId, source, metadata);
  }

  restoreCognitiveSnapshot(snapshotId: string): CognitiveSnapshot | undefined {
    return this._snapshotManager.restoreSnapshot(snapshotId);
  }

  getExecutionTimeline(executionId: string): ExecutionTimeline {
    const events = this.eventStore.stream(executionId);
    return this._timelineBuilder.build(events);
  }

  // ── v4.5 Phase 2: Reliability Stress Infrastructure ─────────────────────────
  readonly faultInjector = new FaultInjector();
  readonly stressRunner = new StressRunner(this.faultInjector);
  readonly reliabilityMetrics = new ReliabilityMetrics();
  readonly stabilityAnalyzer = new StabilityAnalyzer();
  readonly recoveryEvaluator = new RecoveryEvaluator();
  readonly chaosEngine = new ChaosEngine(this.faultInjector, 'SAFE');
  readonly determinismValidator = new DeterminismValidator();

  async runStressScenario(scenario: StressScenario): Promise<StressReport> {
    return this.stressRunner.runScenario(scenario);
  }

  runChaosTest(policyLevel: ChaosPolicyLevel = 'BALANCED'): void {
    this.chaosEngine.applyPolicy(policyLevel);
    this.chaosEngine.start();
  }

  validateDeterminism(executionId: string): DeterminismReport {
    return this.determinismValidator.validateDeterminism(executionId);
  }

  getReliabilitySnapshot(): ReliabilitySnapshot {
    return this.reliabilityMetrics.snapshot();
  }

  getStabilityReport(): StabilityReport {
    return this.stabilityAnalyzer.analyze();
  }

  close(): void {
    this.chaosEngine.stop();
    this.watcher.stop();
    this.db.close();
  }
}
