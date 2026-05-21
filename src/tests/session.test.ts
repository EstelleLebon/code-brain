import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../session/SessionContext.js';
import { applySessionBias } from '../session/SessionBias.js';
import { RetrievalResult, TruthLevel } from '../types/index.js';

function makeResult(symbolId: string, filePath: string, score: number): RetrievalResult {
  return {
    chunk: {
      id: `chunk_${symbolId}`,
      symbolId,
      content: `content for ${symbolId}`,
      hash: `hash_${symbolId}`,
      truthLevel: TruthLevel.STRUCTURAL,
    },
    score,
    trace: {
      source: filePath,
      retrievalReason: 'semantic_similarity',
      confidence: score,
      truthLevel: TruthLevel.STRUCTURAL,
    },
  };
}

describe('SessionManager', () => {
  test('createSession returns a unique id', () => {
    const manager = new SessionManager();
    const id1 = manager.createSession();
    const id2 = manager.createSession();
    assert.ok(id1.length > 0, 'Session ID should not be empty');
    assert.notEqual(id1, id2, 'Session IDs should be unique');
  });

  test('recordAccess increments access count', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();

    manager.recordAccess(sessionId, 'sym_001', '/repo/a.ts');
    manager.recordAccess(sessionId, 'sym_001', '/repo/a.ts');
    manager.recordAccess(sessionId, 'sym_002', '/repo/b.ts');

    const focused = manager.getFocusedSymbols(sessionId);
    const sym001 = focused.find(e => e.symbolId === 'sym_001');
    const sym002 = focused.find(e => e.symbolId === 'sym_002');

    assert.ok(sym001, 'sym_001 should be in focused symbols');
    assert.equal(sym001?.accessCount, 2, 'sym_001 access count should be 2');
    assert.ok(sym002, 'sym_002 should be in focused symbols');
    assert.equal(sym002?.accessCount, 1, 'sym_002 access count should be 1');
  });

  test('getFocusedSymbols returns sorted by accessCount desc', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();

    manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
    manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');
    manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');
    manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');

    const focused = manager.getFocusedSymbols(sessionId);
    assert.equal(focused[0]!.symbolId, 'sym_b', 'Most accessed symbol should be first');
  });

  test('getFocusedSymbols respects limit', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();

    for (let i = 0; i < 10; i++) {
      manager.recordAccess(sessionId, `sym_${i}`, `/repo/file_${i}.ts`);
    }

    const focused = manager.getFocusedSymbols(sessionId, 3);
    assert.equal(focused.length, 3, 'Should respect limit');
  });

  test('clearSession removes the session', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();
    manager.recordAccess(sessionId, 'sym_x', '/repo/x.ts');
    manager.clearSession(sessionId);
    const session = manager.getSession(sessionId);
    assert.equal(session, undefined, 'Session should be cleared');
  });
});

describe('applySessionBias', () => {
  test('boosts results matching session entries', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();
    manager.recordAccess(sessionId, 'sym_hot', '/repo/hot.ts');

    const session = manager.getSession(sessionId)!;

    const results: RetrievalResult[] = [
      makeResult('sym_hot', '/repo/hot.ts', 0.5),
      makeResult('sym_cold', '/repo/cold.ts', 0.8),
    ];

    const biased = applySessionBias(results, session, 0.2);

    // sym_hot gets boosted: 0.5 + 0.2 = 0.7, sym_cold stays at 0.8
    // So order should be: sym_cold (0.8), sym_hot (0.7)
    assert.equal(biased[0]!.chunk.symbolId, 'sym_cold', 'sym_cold should still be first (0.8 > 0.7)');
    assert.equal(biased[1]!.chunk.symbolId, 'sym_hot', 'sym_hot should be second after boost');
    assert.ok(biased[1]!.score > 0.5, 'sym_hot score should be boosted');
  });

  test('sets retrievalReason to session_bias for boosted items', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();
    manager.recordAccess(sessionId, 'sym_focus', '/repo/focus.ts');

    const session = manager.getSession(sessionId)!;
    const results: RetrievalResult[] = [
      makeResult('sym_focus', '/repo/focus.ts', 0.5),
      makeResult('sym_other', '/repo/other.ts', 0.4),
    ];

    const biased = applySessionBias(results, session);
    const focusResult = biased.find(r => r.chunk.symbolId === 'sym_focus');
    assert.equal(focusResult?.trace.retrievalReason, 'session_bias', 'Boosted item should have session_bias reason');
  });

  test('re-sorts by score desc after boost', () => {
    const manager = new SessionManager();
    const sessionId = manager.createSession();
    manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
    manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
    manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');

    const session = manager.getSession(sessionId)!;
    const results: RetrievalResult[] = [
      makeResult('sym_b', '/repo/b.ts', 0.9),
      makeResult('sym_a', '/repo/a.ts', 0.3),
    ];

    const biased = applySessionBias(results, session, 0.5);
    // sym_a: 0.3 + 0.5 = 0.8, sym_b: 0.9 — sym_b still first
    assert.equal(biased[0]!.chunk.symbolId, 'sym_b');
    assert.equal(biased[1]!.chunk.symbolId, 'sym_a');
  });
});
