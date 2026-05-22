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
const CognitiveFeedbackLoop_js_1 = require("../cognitive-loop/CognitiveFeedbackLoop.js");
const ModeSelector_js_1 = require("../cognitive-modes/ModeSelector.js");
const SelfHealingEngine_js_1 = require("../self-healing/SelfHealingEngine.js");
const MetricsAggregator_js_1 = require("../metrics/MetricsAggregator.js");
const WorkingMemory_js_1 = require("../hierarchical-memory/WorkingMemory.js");
const EpisodicMemory_js_1 = require("../hierarchical-memory/EpisodicMemory.js");
const SemanticMemory_js_1 = require("../hierarchical-memory/SemanticMemory.js");
const ProceduralMemory_js_1 = require("../hierarchical-memory/ProceduralMemory.js");
const GoalDecomposer_js_1 = require("../goals/GoalDecomposer.js");
const PlanGenerator_js_1 = require("../planning/PlanGenerator.js");
const AdaptivePlanner_js_1 = require("../planning/AdaptivePlanner.js");
const ExecutionCheckpoint_js_1 = require("../autonomous-execution/ExecutionCheckpoint.js");
const AutonomousExecutor_js_1 = require("../autonomous-execution/AutonomousExecutor.js");
const PlanningMetrics_js_1 = require("../planning-metrics/PlanningMetrics.js");
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
    // v3.5 — Autonomous Cognitive Loop subsystems
    feedbackLoop;
    modeSelector;
    selfHealingEngine;
    metricsAggregator;
    workingMemory;
    episodicMemory;
    semanticMemory;
    proceduralMemory;
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
        // v3.5 — instantiate autonomous cognitive loop subsystems
        this.feedbackLoop = new CognitiveFeedbackLoop_js_1.CognitiveFeedbackLoop();
        this.modeSelector = new ModeSelector_js_1.ModeSelector();
        this.selfHealingEngine = new SelfHealingEngine_js_1.SelfHealingEngine();
        this.metricsAggregator = new MetricsAggregator_js_1.MetricsAggregator();
        const sessionId = this.sessionManager.createSession();
        this.workingMemory = new WorkingMemory_js_1.WorkingMemory(sessionId);
        this.episodicMemory = new EpisodicMemory_js_1.EpisodicMemory();
        this.semanticMemory = new SemanticMemory_js_1.SemanticMemory();
        this.proceduralMemory = new ProceduralMemory_js_1.ProceduralMemory();
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
    // ── v4.0: Goal-Oriented Autonomous Planning ──────────────────────────────────
    _goalDecomposer = new GoalDecomposer_js_1.GoalDecomposer();
    _planGenerator = new PlanGenerator_js_1.PlanGenerator();
    _adaptivePlanner = new AdaptivePlanner_js_1.AdaptivePlanner();
    _checkpointManager = new ExecutionCheckpoint_js_1.CheckpointManager();
    _autonomousExecutor = new AutonomousExecutor_js_1.AutonomousExecutor(this._adaptivePlanner, this._checkpointManager);
    _planningMetrics = new PlanningMetrics_js_1.PlanningMetrics();
    _executionPlans = new Map();
    createGoal(description, type, options = {}) {
        const id = `goal-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
        const goal = {
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
    planGoal(goal) {
        const subGoals = this._goalDecomposer.decompose(goal);
        const goalWithSubs = { ...goal, subGoals };
        const plan = this._planGenerator.generate([goalWithSubs]);
        this._executionPlans.set(plan.id, plan);
        return plan;
    }
    async executeGoal(goal) {
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
    pauseExecution() {
        this._autonomousExecutor.pause();
    }
    resumeExecution() {
        this._autonomousExecutor.resume();
    }
    abortExecution() {
        this._autonomousExecutor.abort();
    }
    getExecutionGraph(planId) {
        return this._executionPlans.get(planId)?.graph;
    }
    getPlanningMetrics() {
        return this._planningMetrics.summary();
    }
    // ── v3.5: Cognitive health API ───────────────────────────────────────────────
    getCognitiveHealth() {
        const trustState = this.feedbackLoop.adaptiveTrust.getState();
        const recoverySuccessRate = this.selfHealingEngine.unresolvedCount() === 0
            ? 1
            : 1 - (this.selfHealingEngine.unresolvedCount() / Math.max(1, this.selfHealingEngine.getHistory().length));
        return this.metricsAggregator.cognitiveHealth(trustState.confidence, recoverySuccessRate);
    }
    getCognitiveSummary() {
        return this.feedbackLoop.summary();
    }
    close() {
        this.watcher.stop();
        this.db.close();
    }
}
exports.CodeBrain = CodeBrain;
//# sourceMappingURL=api.js.map