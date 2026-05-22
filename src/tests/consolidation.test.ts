import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { MIGRATIONS, CREATE_TABLES_SQL } from '../models/schema.js';
import { computeDecayScore } from '../consolidation/RetrievalDecay.js';
import { summarizeCluster } from '../consolidation/SemanticSummarizer.js';
import { MemoryCompactor } from '../consolidation/MemoryCompactor.js';
import { ConsolidationEngine } from '../consolidation/ConsolidationEngine.js';
import { TruthLevel } from '../types/index.js';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(CREATE_TABLES_SQL);
  for (const m of MIGRATIONS) {
    if (m.sql) db.exec(m.sql);
  }
  return db;
}

function makeChunk(id: string, symbolId: string, content: string, truthLevel = TruthLevel.STRUCTURAL): any {
  return { id, symbolId, content, embedding: [0.1, 0.2], truthLevel, createdAt: Date.now() };
}

describe('RetrievalDecay', () => {
  test('high access + recent = high score', () => {
    const chunk = makeChunk('c1', 'sym-1', 'foo');
    const { finalScore } = computeDecayScore({ chunk, accessCount: 10, lastAccessedAt: Date.now() });
    assert.ok(finalScore > 0.5);
  });

  test('contradiction penalty reduces score', () => {
    const chunk = makeChunk('c1', 'sym-1', 'foo');
    const base = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: Date.now() });
    const penalized = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: Date.now(), hasContradiction: true });
    assert.ok(penalized.finalScore < base.finalScore);
  });

  test('stale artifact penalty reduces score', () => {
    const chunk = makeChunk('c1', 'sym-1', 'foo');
    const base = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: Date.now() });
    const stale = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: Date.now(), wasStale: true });
    assert.ok(stale.finalScore < base.finalScore);
  });

  test('score decays with age', () => {
    const chunk = makeChunk('c1', 'sym-1', 'foo');
    const now = Date.now();
    const fresh = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: now }, now);
    const old = computeDecayScore({ chunk, accessCount: 5, lastAccessedAt: now - 30 * 24 * 60 * 60 * 1000 }, now);
    assert.ok(old.recency < fresh.recency);
  });
});

describe('SemanticSummarizer', () => {
  test('empty cluster returns empty summary', () => {
    const summary = summarizeCluster([]);
    assert.equal(summary.chunkCount, 0);
    assert.equal(summary.content, '');
  });

  test('deduplicates content lines', () => {
    const chunks = [
      makeChunk('c1', 'sym-1', 'function foo() {}\nconst x = 1'),
      makeChunk('c2', 'sym-1', 'function foo() {}\nconst y = 2'),
    ];
    const summary = summarizeCluster(chunks);
    const lines = summary.content.split('\n');
    const unique = new Set(lines);
    assert.equal(lines.length, unique.size);
  });

  test('uses best truth level from cluster', () => {
    const chunks = [
      makeChunk('c1', 'sym-1', 'foo', TruthLevel.STRUCTURAL),
      makeChunk('c2', 'sym-2', 'bar', TruthLevel.HEURISTIC),
    ];
    const summary = summarizeCluster(chunks);
    assert.equal(summary.truthLevel, TruthLevel.STRUCTURAL);
  });

  test('collects all unique symbolIds', () => {
    const chunks = [
      makeChunk('c1', 'sym-1', 'a'),
      makeChunk('c2', 'sym-2', 'b'),
      makeChunk('c3', 'sym-1', 'c'),
    ];
    const summary = summarizeCluster(chunks);
    assert.equal(summary.symbolIds.length, 2);
  });
});

describe('MemoryCompactor', () => {
  test('compact removes stale chunks', () => {
    const db = makeDb();
    // Insert a symbol first (FK constraint)
    db.prepare('INSERT INTO symbols (id, name, kind, file_path, start_line, end_line, hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run('sym-1', 'foo', 'function', 'src/a.ts', 1, 10, 'h1', 0, 0);
    db.prepare('INSERT INTO chunks (id, symbol_id, content, hash, invalidated_at) VALUES (?,?,?,?,?)').run('c-stale', 'sym-1', 'x', 'h', 1000);
    db.prepare('INSERT INTO chunks (id, symbol_id, content, hash) VALUES (?,?,?,?)').run('c-fresh', 'sym-1', 'y', 'h2');

    const compactor = new MemoryCompactor(db);
    const result = compactor.compact({ staleBeforeMs: Date.now(), vacuum: false });
    assert.equal(result.staleChunksRemoved, 1);
    const remaining = db.prepare('SELECT id FROM chunks').all() as any[];
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'c-fresh');
  });

  test('compact removes old replay events', () => {
    const db = makeDb();
    db.prepare('INSERT INTO replay_events (id, operation_id, event_type, payload, timestamp) VALUES (?,?,?,?,?)').run('e1', 'op-1', 'file_changed', '{}', 100);
    const compactor = new MemoryCompactor(db);
    const result = compactor.compact({ replayExpireMs: Date.now(), vacuum: false });
    assert.equal(result.replayEventsArchived, 1);
  });
});

describe('ConsolidationEngine', () => {
  test('consolidate runs without error', () => {
    const db = makeDb();
    const engine = new ConsolidationEngine(db);
    const result = engine.consolidate({ compactOptions: { vacuum: false } });
    assert.ok(result.compaction);
    assert.ok(result.summaries !== undefined);
    assert.ok(result.decayScores instanceof Map);
  });

  test('consolidate summarizes multi-chunk symbols', () => {
    const db = makeDb();
    const engine = new ConsolidationEngine(db);
    const chunks = [
      makeChunk('c1', 'sym-shared', 'line one'),
      makeChunk('c2', 'sym-shared', 'line two'),
      makeChunk('c3', 'sym-solo', 'solo'),
    ];
    const result = engine.consolidate({ chunks, compactOptions: { vacuum: false } });
    assert.equal(result.summaries.length, 1); // only sym-shared has >1 chunk
    assert.equal(result.summaries[0].symbolIds[0], 'sym-shared');
  });

  test('consolidate computes decay scores', () => {
    const db = makeDb();
    const engine = new ConsolidationEngine(db);
    const chunk = makeChunk('c1', 'sym-1', 'hello');
    const result = engine.consolidate({
      decayInputs: [{ chunk, accessCount: 3, lastAccessedAt: Date.now() }],
      compactOptions: { vacuum: false },
    });
    assert.ok(result.decayScores.has('c1'));
    assert.ok(result.decayScores.get('c1')!.finalScore > 0);
  });
});
