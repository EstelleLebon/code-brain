import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WorkingMemory } from '../hierarchical-memory/WorkingMemory.js';
import { EpisodicMemory } from '../hierarchical-memory/EpisodicMemory.js';
import { SemanticMemory } from '../hierarchical-memory/SemanticMemory.js';
import { ProceduralMemory } from '../hierarchical-memory/ProceduralMemory.js';
import { CognitiveMode } from '../cognitive-modes/CognitiveMode.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';

function makeSignal(): RuntimeSignal {
  return { id: 's1', signalType: 'test', status: 'success', source: 'jest', timestamp: Date.now() };
}

function makeOutcome(): ExecutionOutcome {
  return { id: 'o1', operationId: 'op1', outcome: 'success', signals: [], riskObserved: 10, summary: [], timestamp: Date.now() };
}

describe('WorkingMemory', () => {
  test('stores active chunks', () => {
    const wm = new WorkingMemory('session-1');
    wm.setActiveChunks(['chunk-a', 'chunk-b']);
    const snap = wm.snapshot();
    assert.deepEqual(snap.activeChunkIds, ['chunk-a', 'chunk-b']);
  });

  test('buffers signals up to maxSignals', () => {
    const wm = new WorkingMemory('s', 99999, 3);
    wm.addSignal(makeSignal());
    wm.addSignal(makeSignal());
    wm.addSignal(makeSignal());
    wm.addSignal(makeSignal()); // triggers shift
    assert.equal(wm.snapshot().recentSignals.length, 3);
  });

  test('buffers outcomes up to maxOutcomes', () => {
    const wm = new WorkingMemory('s', 99999, 50, 2);
    wm.addOutcome(makeOutcome());
    wm.addOutcome(makeOutcome());
    wm.addOutcome(makeOutcome()); // triggers shift
    assert.equal(wm.snapshot().recentOutcomes.length, 2);
  });

  test('clear resets state', () => {
    const wm = new WorkingMemory('s');
    wm.addSignal(makeSignal());
    wm.setActiveChunks(['chunk-a']);
    wm.clear();
    const snap = wm.snapshot();
    assert.equal(snap.recentSignals.length, 0);
    assert.equal(snap.activeChunkIds.length, 0);
  });

  test('isExpired returns false for fresh memory', () => {
    const wm = new WorkingMemory('s', 60_000);
    assert.equal(wm.isExpired(), false);
  });

  test('isExpired returns true for ttl=0', () => {
    const wm = new WorkingMemory('s', 0);
    assert.equal(wm.isExpired(), true);
  });
});

describe('EpisodicMemory', () => {
  test('records episodes', () => {
    const mem = new EpisodicMemory();
    mem.record('transformation', 'Rename foo', 'Renamed symbol foo → bar', ['rename']);
    assert.equal(mem.size(), 1);
  });

  test('search by type', () => {
    const mem = new EpisodicMemory();
    mem.record('failure', 'Build failed', 'TypeScript error', ['build']);
    mem.record('transformation', 'Good rename', 'ok', []);
    assert.equal(mem.search('failure').length, 1);
    assert.equal(mem.search('transformation').length, 1);
  });

  test('search by tag', () => {
    const mem = new EpisodicMemory();
    mem.record('recovery', 'Rollback', 'Rolled back 3 files', ['rollback', 'critical']);
    mem.record('session', 'Session start', 'ok', ['session']);
    assert.equal(mem.search(undefined, 'rollback').length, 1);
    assert.equal(mem.search(undefined, 'critical').length, 1);
  });

  test('recent returns newest first', () => {
    const mem = new EpisodicMemory();
    mem.record('session', 'A', 'a', []);
    mem.record('session', 'B', 'b', []);
    const recent = mem.recent(2);
    assert.equal(recent[0].title, 'B');
  });

  test('evicts oldest when over maxSize', () => {
    const mem = new EpisodicMemory(3);
    mem.record('session', 'A', 'a', []);
    mem.record('session', 'B', 'b', []);
    mem.record('session', 'C', 'c', []);
    mem.record('session', 'D', 'd', []); // evicts A
    assert.equal(mem.size(), 3);
    assert.ok(!mem.all().find(e => e.title === 'A'));
  });
});

describe('SemanticMemory', () => {
  test('upsert creates new fact', () => {
    const mem = new SemanticMemory();
    const fact = mem.upsert('dependency-injection', 'Constructor injection pattern', 0.8, 'src-1');
    assert.equal(fact.concept, 'dependency-injection');
    assert.equal(fact.confidence, 0.8);
  });

  test('upsert merges confidence on duplicate', () => {
    const mem = new SemanticMemory();
    mem.upsert('di', 'pattern', 0.6, 'src-1');
    const updated = mem.upsert('di', 'pattern', 0.8, 'src-2');
    // confidence = (0.6 + 0.8) / 2 = 0.7
    assert.ok(Math.abs(updated.confidence - 0.7) < 0.01);
    assert.ok(updated.sources.includes('src-2'));
  });

  test('search finds by keyword', () => {
    const mem = new SemanticMemory();
    mem.upsert('singleton', 'One instance pattern', 0.9, 'src-1');
    mem.upsert('factory', 'Creation pattern', 0.7, 'src-2');
    assert.equal(mem.search('singleton').length, 1);
    assert.equal(mem.search('pattern').length, 2);
  });

  test('topByConfidence returns sorted results', () => {
    const mem = new SemanticMemory();
    mem.upsert('a', 'low', 0.3, 'x');
    mem.upsert('b', 'high', 0.9, 'x');
    mem.upsert('c', 'mid', 0.6, 'x');
    const top = mem.topByConfidence(2);
    assert.equal(top[0].concept, 'b');
    assert.equal(top[1].concept, 'c');
  });
});

describe('ProceduralMemory', () => {
  test('records new pattern', () => {
    const mem = new ProceduralMemory();
    const p = mem.record('rename-flow', CognitiveMode.SAFE_REFACTOR, ['rename_symbol'], true, 200);
    assert.equal(p.successRate, 1);
    assert.equal(p.executionCount, 1);
  });

  test('updates existing pattern success rate', () => {
    const mem = new ProceduralMemory();
    mem.record('flow', CognitiveMode.HOTFIX, ['rename_symbol'], true, 100);
    mem.record('flow', CognitiveMode.HOTFIX, ['rename_symbol'], false, 150);
    const p = mem.find('flow', CognitiveMode.HOTFIX)!;
    assert.equal(p.executionCount, 2);
    assert.ok(Math.abs(p.successRate - 0.5) < 0.01);
  });

  test('bestForMode returns only patterns with 2+ executions sorted by rate', () => {
    const mem = new ProceduralMemory();
    mem.record('a', CognitiveMode.RECOVERY, ['op1'], true, 100);
    mem.record('a', CognitiveMode.RECOVERY, ['op1'], true, 100);
    mem.record('b', CognitiveMode.RECOVERY, ['op2'], true, 100);  // only 1 exec
    const best = mem.bestForMode(CognitiveMode.RECOVERY);
    assert.equal(best.length, 1);
    assert.equal(best[0].name, 'a');
  });
});
