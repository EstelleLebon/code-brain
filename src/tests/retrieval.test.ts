import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { DB } from '../persistence/db.js';
import { Embedder } from '../embeddings/embedder.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { Retrieval } from '../retrieval/retrieval.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { ClaimsEngine } from '../claims/claims-engine.js';
import { SymbolNode } from '../types/index.js';
import { chunkSymbol } from '../chunks/chunker.js';

function makeTempDb(): { db: DB; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-brain-test-'));
  const dbPath = path.join(dir, 'test.db');
  const db = new DB(dbPath);
  return {
    db,
    cleanup: () => {
      db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function makeSymbol(overrides: Partial<SymbolNode> = {}): SymbolNode {
  const now = Date.now();
  return {
    id: overrides.id ?? 'sym_' + Math.random().toString(36).slice(2, 10),
    name: overrides.name ?? 'testSymbol',
    kind: overrides.kind ?? 'function',
    filePath: overrides.filePath ?? '/test/file.ts',
    startLine: overrides.startLine ?? 1,
    endLine: overrides.endLine ?? 10,
    signature: overrides.signature ?? 'function testSymbol(): void',
    exported: overrides.exported ?? true,
    dependencies: overrides.dependencies ?? [],
    hash: overrides.hash ?? 'abc123def456abc1',
    createdAt: now,
    updatedAt: now,
  };
}

describe('Retrieval', () => {
  test('getSymbol returns exact match', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const sym = makeSymbol({ name: 'authenticate', kind: 'function' });
      db.insertSymbol(sym);

      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);
      const retrieval = new Retrieval(db, embedder, graph, telemetry);

      const found = retrieval.getSymbol('authenticate');
      assert.ok(found, 'Should find the symbol');
      assert.equal(found?.name, 'authenticate');
    } finally {
      cleanup();
    }
  });

  test('getSymbolById returns correct symbol', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const sym = makeSymbol({ id: 'test_id_123456789', name: 'myFunc' });
      db.insertSymbol(sym);

      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);
      const retrieval = new Retrieval(db, embedder, graph, telemetry);

      const found = retrieval.getSymbolById('test_id_123456789');
      assert.ok(found, 'Should find by id');
      assert.equal(found?.name, 'myFunc');
    } finally {
      cleanup();
    }
  });

  test('findRelevant returns symbols for matching query', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);

      // Insert symbols with content
      const sym1 = makeSymbol({ name: 'validateUser', kind: 'function', signature: 'function validateUser(token: string): boolean' });
      const sym2 = makeSymbol({ id: 'sym2_id_12345678', name: 'parseConfig', kind: 'function', signature: 'function parseConfig(path: string): object' });
      db.insertSymbol(sym1);
      db.insertSymbol(sym2);

      // Insert chunks and embeddings
      const chunk1 = chunkSymbol(sym1, sym1.signature);
      const chunk2 = chunkSymbol(sym2, sym2.signature);
      db.insertChunk(chunk1);
      db.insertChunk(chunk2);

      embedder.computeAndStore(chunk1.id, (chunk1.content + ' ' + chunk1.summary).trim());
      embedder.computeAndStore(chunk2.id, (chunk2.content + ' ' + chunk2.summary).trim());

      const retrieval = new Retrieval(db, embedder, graph, telemetry);
      const results = retrieval.findRelevant('validate token user', 5);

      assert.ok(results.length > 0, 'Should return at least one result');
    } finally {
      cleanup();
    }
  });

  test('getDependencies traverses graph', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);
      const retrieval = new Retrieval(db, embedder, graph, telemetry);

      const symA = makeSymbol({ id: 'aaaaaaaaaaaaaaaa', name: 'funcA' });
      const symB = makeSymbol({ id: 'bbbbbbbbbbbbbbbb', name: 'funcB' });
      db.insertSymbol(symA);
      db.insertSymbol(symB);
      graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });

      const deps = retrieval.getDependencies(symA.id, 1);
      assert.ok(deps.some(s => s.id === symB.id), 'funcA should depend on funcB');
    } finally {
      cleanup();
    }
  });

  test('getDependents traverses reverse graph', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);
      const retrieval = new Retrieval(db, embedder, graph, telemetry);

      const symA = makeSymbol({ id: 'aaaaaaaaaaaaaaaa', name: 'funcA' });
      const symB = makeSymbol({ id: 'bbbbbbbbbbbbbbbb', name: 'funcB' });
      db.insertSymbol(symA);
      db.insertSymbol(symB);
      graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });

      const dependents = retrieval.getDependents(symB.id, 1);
      assert.ok(dependents.some(s => s.id === symA.id), 'funcB should have funcA as dependent');
    } finally {
      cleanup();
    }
  });

  test('queryContext expands to include dependencies', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const telemetry = new Telemetry(false);
      const graph = new DependencyGraph();
      const embedder = new Embedder(db, telemetry, 64);

      const sym1 = makeSymbol({ name: 'authMiddleware', kind: 'function', signature: 'function authMiddleware(req: Request): void' });
      const sym2 = makeSymbol({ id: 'dep_id_123456789', name: 'verifyToken', kind: 'function', signature: 'function verifyToken(t: string): boolean' });
      db.insertSymbol(sym1);
      db.insertSymbol(sym2);

      const chunk1 = chunkSymbol(sym1, sym1.signature);
      const chunk2 = chunkSymbol(sym2, sym2.signature);
      db.insertChunk(chunk1);
      db.insertChunk(chunk2);

      embedder.computeAndStore(chunk1.id, chunk1.content + ' ' + chunk1.summary);
      embedder.computeAndStore(chunk2.id, chunk2.content + ' ' + chunk2.summary);

      graph.addEdge({ fromId: sym1.id, toId: sym2.id, kind: 'call' });

      const retrieval = new Retrieval(db, embedder, graph, telemetry);
      const ctx = retrieval.queryContext('authentication middleware token');

      assert.ok(ctx.symbols.length > 0, 'Should return symbols');
      assert.ok(ctx.chunks.length > 0, 'Should return chunks');
    } finally {
      cleanup();
    }
  });
});
