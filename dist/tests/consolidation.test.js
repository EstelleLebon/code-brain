"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const schema_js_1 = require("../models/schema.js");
const RetrievalDecay_js_1 = require("../consolidation/RetrievalDecay.js");
const SemanticSummarizer_js_1 = require("../consolidation/SemanticSummarizer.js");
const MemoryCompactor_js_1 = require("../consolidation/MemoryCompactor.js");
const ConsolidationEngine_js_1 = require("../consolidation/ConsolidationEngine.js");
const index_js_1 = require("../types/index.js");
function makeDb() {
    const db = new better_sqlite3_1.default(':memory:');
    db.pragma('journal_mode = WAL');
    db.exec(schema_js_1.CREATE_TABLES_SQL);
    for (const m of schema_js_1.MIGRATIONS) {
        if (m.sql)
            db.exec(m.sql);
    }
    return db;
}
function makeChunk(id, symbolId, content, truthLevel = index_js_1.TruthLevel.STRUCTURAL) {
    return { id, symbolId, content, embedding: [0.1, 0.2], truthLevel, createdAt: Date.now() };
}
(0, node_test_1.describe)('RetrievalDecay', () => {
    (0, node_test_1.test)('high access + recent = high score', () => {
        const chunk = makeChunk('c1', 'sym-1', 'foo');
        const { finalScore } = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 10, lastAccessedAt: Date.now() });
        strict_1.default.ok(finalScore > 0.5);
    });
    (0, node_test_1.test)('contradiction penalty reduces score', () => {
        const chunk = makeChunk('c1', 'sym-1', 'foo');
        const base = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: Date.now() });
        const penalized = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: Date.now(), hasContradiction: true });
        strict_1.default.ok(penalized.finalScore < base.finalScore);
    });
    (0, node_test_1.test)('stale artifact penalty reduces score', () => {
        const chunk = makeChunk('c1', 'sym-1', 'foo');
        const base = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: Date.now() });
        const stale = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: Date.now(), wasStale: true });
        strict_1.default.ok(stale.finalScore < base.finalScore);
    });
    (0, node_test_1.test)('score decays with age', () => {
        const chunk = makeChunk('c1', 'sym-1', 'foo');
        const now = Date.now();
        const fresh = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: now }, now);
        const old = (0, RetrievalDecay_js_1.computeDecayScore)({ chunk, accessCount: 5, lastAccessedAt: now - 30 * 24 * 60 * 60 * 1000 }, now);
        strict_1.default.ok(old.recency < fresh.recency);
    });
});
(0, node_test_1.describe)('SemanticSummarizer', () => {
    (0, node_test_1.test)('empty cluster returns empty summary', () => {
        const summary = (0, SemanticSummarizer_js_1.summarizeCluster)([]);
        strict_1.default.equal(summary.chunkCount, 0);
        strict_1.default.equal(summary.content, '');
    });
    (0, node_test_1.test)('deduplicates content lines', () => {
        const chunks = [
            makeChunk('c1', 'sym-1', 'function foo() {}\nconst x = 1'),
            makeChunk('c2', 'sym-1', 'function foo() {}\nconst y = 2'),
        ];
        const summary = (0, SemanticSummarizer_js_1.summarizeCluster)(chunks);
        const lines = summary.content.split('\n');
        const unique = new Set(lines);
        strict_1.default.equal(lines.length, unique.size);
    });
    (0, node_test_1.test)('uses best truth level from cluster', () => {
        const chunks = [
            makeChunk('c1', 'sym-1', 'foo', index_js_1.TruthLevel.STRUCTURAL),
            makeChunk('c2', 'sym-2', 'bar', index_js_1.TruthLevel.HEURISTIC),
        ];
        const summary = (0, SemanticSummarizer_js_1.summarizeCluster)(chunks);
        strict_1.default.equal(summary.truthLevel, index_js_1.TruthLevel.STRUCTURAL);
    });
    (0, node_test_1.test)('collects all unique symbolIds', () => {
        const chunks = [
            makeChunk('c1', 'sym-1', 'a'),
            makeChunk('c2', 'sym-2', 'b'),
            makeChunk('c3', 'sym-1', 'c'),
        ];
        const summary = (0, SemanticSummarizer_js_1.summarizeCluster)(chunks);
        strict_1.default.equal(summary.symbolIds.length, 2);
    });
});
(0, node_test_1.describe)('MemoryCompactor', () => {
    (0, node_test_1.test)('compact removes stale chunks', () => {
        const db = makeDb();
        // Insert a symbol first (FK constraint)
        db.prepare('INSERT INTO symbols (id, name, kind, file_path, start_line, end_line, hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run('sym-1', 'foo', 'function', 'src/a.ts', 1, 10, 'h1', 0, 0);
        db.prepare('INSERT INTO chunks (id, symbol_id, content, hash, invalidated_at) VALUES (?,?,?,?,?)').run('c-stale', 'sym-1', 'x', 'h', 1000);
        db.prepare('INSERT INTO chunks (id, symbol_id, content, hash) VALUES (?,?,?,?)').run('c-fresh', 'sym-1', 'y', 'h2');
        const compactor = new MemoryCompactor_js_1.MemoryCompactor(db);
        const result = compactor.compact({ staleBeforeMs: Date.now(), vacuum: false });
        strict_1.default.equal(result.staleChunksRemoved, 1);
        const remaining = db.prepare('SELECT id FROM chunks').all();
        strict_1.default.equal(remaining.length, 1);
        strict_1.default.equal(remaining[0].id, 'c-fresh');
    });
    (0, node_test_1.test)('compact removes old replay events', () => {
        const db = makeDb();
        db.prepare('INSERT INTO replay_events (id, operation_id, event_type, payload, timestamp) VALUES (?,?,?,?,?)').run('e1', 'op-1', 'file_changed', '{}', 100);
        const compactor = new MemoryCompactor_js_1.MemoryCompactor(db);
        const result = compactor.compact({ replayExpireMs: Date.now(), vacuum: false });
        strict_1.default.equal(result.replayEventsArchived, 1);
    });
});
(0, node_test_1.describe)('ConsolidationEngine', () => {
    (0, node_test_1.test)('consolidate runs without error', () => {
        const db = makeDb();
        const engine = new ConsolidationEngine_js_1.ConsolidationEngine(db);
        const result = engine.consolidate({ compactOptions: { vacuum: false } });
        strict_1.default.ok(result.compaction);
        strict_1.default.ok(result.summaries !== undefined);
        strict_1.default.ok(result.decayScores instanceof Map);
    });
    (0, node_test_1.test)('consolidate summarizes multi-chunk symbols', () => {
        const db = makeDb();
        const engine = new ConsolidationEngine_js_1.ConsolidationEngine(db);
        const chunks = [
            makeChunk('c1', 'sym-shared', 'line one'),
            makeChunk('c2', 'sym-shared', 'line two'),
            makeChunk('c3', 'sym-solo', 'solo'),
        ];
        const result = engine.consolidate({ chunks, compactOptions: { vacuum: false } });
        strict_1.default.equal(result.summaries.length, 1); // only sym-shared has >1 chunk
        strict_1.default.equal(result.summaries[0].symbolIds[0], 'sym-shared');
    });
    (0, node_test_1.test)('consolidate computes decay scores', () => {
        const db = makeDb();
        const engine = new ConsolidationEngine_js_1.ConsolidationEngine(db);
        const chunk = makeChunk('c1', 'sym-1', 'hello');
        const result = engine.consolidate({
            decayInputs: [{ chunk, accessCount: 3, lastAccessedAt: Date.now() }],
            compactOptions: { vacuum: false },
        });
        strict_1.default.ok(result.decayScores.has('c1'));
        strict_1.default.ok(result.decayScores.get('c1').finalScore > 0);
    });
});
//# sourceMappingURL=consolidation.test.js.map