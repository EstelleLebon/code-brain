import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { DB } from '../persistence/db.js';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { Telemetry } from '../telemetry/telemetry.js';
import { InvalidationEngine } from '../invalidation/InvalidationEngine.js';
import { SymbolNode } from '../types/index.js';
import { TruthLevel } from '../types/index.js';

function makeTempDb(): { db: DB; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-brain-inv-test-'));
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

function makeSymbol(id: string, name: string, filePath: string): SymbolNode {
  const now = Date.now();
  return {
    id,
    name,
    kind: 'function',
    filePath,
    startLine: 1,
    endLine: 10,
    signature: `function ${name}(): void`,
    exported: true,
    dependencies: [],
    hash: id.slice(0, 16),
    createdAt: now,
    updatedAt: now,
  };
}

describe('InvalidationEngine', () => {
  test('propagates invalidation A→B→C: changing A impacts B and C', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const graph = new DependencyGraph();
      const telemetry = new Telemetry(false);

      // Set up symbols A→B→C
      const symA = makeSymbol('aaaaaaaaaaaaaaaa', 'funcA', '/repo/a.ts');
      const symB = makeSymbol('bbbbbbbbbbbbbbbb', 'funcB', '/repo/b.ts');
      const symC = makeSymbol('cccccccccccccccc', 'funcC', '/repo/c.ts');

      db.insertSymbol(symA);
      db.insertSymbol(symB);
      db.insertSymbol(symC);

      graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });
      graph.addEdge({ fromId: symB.id, toId: symC.id, kind: 'import' });

      // Insert claims for B and C
      db.insertClaim({
        id: 'claim_b_001',
        symbolId: symB.id,
        claim: 'Symbol is exported',
        confidence: 1.0,
        sourceHash: symB.hash,
        truthLevel: TruthLevel.DERIVED,
      });
      db.insertClaim({
        id: 'claim_c_001',
        symbolId: symC.id,
        claim: 'Symbol is exported',
        confidence: 1.0,
        sourceHash: symC.hash,
        truthLevel: TruthLevel.DERIVED,
      });

      // Insert chunks for B and C
      db.insertChunk({
        id: 'chunk_b_001',
        symbolId: symB.id,
        content: 'function funcB(): void {}',
        hash: 'hashb001',
        truthLevel: TruthLevel.STRUCTURAL,
      });
      db.insertChunk({
        id: 'chunk_c_001',
        symbolId: symC.id,
        content: 'function funcC(): void {}',
        hash: 'hashc001',
        truthLevel: TruthLevel.STRUCTURAL,
      });

      const engine = new InvalidationEngine(db, graph, telemetry);
      const result = engine.propagate({
        filePath: '/repo/a.ts',
        symbolIds: [symA.id],
        timestamp: Date.now(),
        reason: 'file_changed',
      });

      // B and C should be in impacted symbols
      assert.ok(result.invalidatedSymbols.includes(symB.id), 'B should be invalidated');
      assert.ok(result.invalidatedSymbols.includes(symC.id), 'C should be invalidated');

      // Claims for B and C should be invalidated
      assert.ok(result.invalidatedClaims.includes('claim_b_001'), 'claim for B should be invalidated');
      assert.ok(result.invalidatedClaims.includes('claim_c_001'), 'claim for C should be invalidated');

      // Chunks for B and C should be invalidated
      assert.ok(result.invalidatedChunks.includes('chunk_b_001'), 'chunk for B should be invalidated');
      assert.ok(result.invalidatedChunks.includes('chunk_c_001'), 'chunk for C should be invalidated');
    } finally {
      cleanup();
    }
  });

  test('propagation with no dependencies only invalidates the changed file symbols', () => {
    const { db, cleanup } = makeTempDb();
    try {
      const graph = new DependencyGraph();
      const telemetry = new Telemetry(false);

      const symX = makeSymbol('xxxxxxxxxxxxxxxx', 'funcX', '/repo/x.ts');
      db.insertSymbol(symX);

      const engine = new InvalidationEngine(db, graph, telemetry);
      const result = engine.propagate({
        filePath: '/repo/x.ts',
        symbolIds: [],
        timestamp: Date.now(),
        reason: 'test',
      });

      assert.ok(result.invalidatedSymbols.includes(symX.id), 'X should be in impacted');
      assert.ok(result.invalidatedFiles.includes('/repo/x.ts'), 'file should be in invalidated files');
    } finally {
      cleanup();
    }
  });
});
