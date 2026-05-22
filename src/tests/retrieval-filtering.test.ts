import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TruthLevel } from '../types/index.js';
import { isTruthLevelAtLeast, Retrieval } from '../retrieval/retrieval.js';
import { RetrievalValidator } from '../retrieval/validation/RetrievalValidator.js';
import type { RetrievalResult } from '../types/index.js';

// Minimal chunk factory
function makeChunk(id: string, symbolId: string, truthLevel = TruthLevel.STRUCTURAL, invalidatedAt?: number): any {
  return {
    id,
    symbolId,
    content: `content-${id}`,
    embedding: [],
    truthLevel,
    createdAt: Date.now(),
    ...(invalidatedAt !== undefined ? { invalidatedAt } : {}),
    filePath: `src/${id}.ts`,
  };
}

function makeResult(chunkId: string, symbolId: string, truthLevel = TruthLevel.STRUCTURAL): RetrievalResult {
  return {
    chunk: makeChunk(chunkId, symbolId, truthLevel),
    score: 0.9,
    trace: { source: `src/${chunkId}.ts`, retrievalReason: 'semantic_similarity', confidence: 0.9, truthLevel },
  };
}

// Access private filterResults via casting
function callFilter(
  results: RetrievalResult[],
  staleIds: string[],
  contradictions: string[],
  minTruthLevel?: TruthLevel,
): { results: RetrievalResult[]; filtering: { totalBeforeFiltering: number; filteredStale: number; filteredContradictions: number; totalAfterFiltering: number } } {
  const r = new Retrieval(
    null as any, null as any, null as any,
    { time: (_k: string, fn: () => unknown) => fn(), log: () => {}, metric: () => {} } as any,
  );
  return (r as any).filterResults(results, staleIds, contradictions, minTruthLevel);
}

describe('isTruthLevelAtLeast', () => {
  test('STRUCTURAL satisfies any minLevel', () => {
    assert.equal(isTruthLevelAtLeast(TruthLevel.STRUCTURAL, TruthLevel.HEURISTIC), true);
    assert.equal(isTruthLevelAtLeast(TruthLevel.STRUCTURAL, TruthLevel.STRUCTURAL), true);
  });

  test('HEURISTIC only satisfies HEURISTIC minimum', () => {
    assert.equal(isTruthLevelAtLeast(TruthLevel.HEURISTIC, TruthLevel.HEURISTIC), true);
    assert.equal(isTruthLevelAtLeast(TruthLevel.HEURISTIC, TruthLevel.SEMANTIC), false);
    assert.equal(isTruthLevelAtLeast(TruthLevel.HEURISTIC, TruthLevel.STRUCTURAL), false);
  });

  test('DERIVED satisfies DERIVED and above', () => {
    assert.equal(isTruthLevelAtLeast(TruthLevel.DERIVED, TruthLevel.STRUCTURAL), false);
    assert.equal(isTruthLevelAtLeast(TruthLevel.DERIVED, TruthLevel.DERIVED), true);
    assert.equal(isTruthLevelAtLeast(TruthLevel.DERIVED, TruthLevel.HEURISTIC), true);
  });
});

describe('RetrievalValidator stale detection', () => {
  test('detects stale chunks with invalidatedAt', () => {
    const validator = new RetrievalValidator();
    const stale = makeChunk('stale-1', 'sym-1', TruthLevel.STRUCTURAL, Date.now() - 1000);
    const fresh = makeChunk('fresh-1', 'sym-2', TruthLevel.STRUCTURAL);
    const result = validator.validate([stale, fresh]);
    assert.ok(result.staleArtifacts.includes('stale-1'));
    assert.ok(!result.staleArtifacts.includes('fresh-1'));
  });

  test('detects contradiction when same symbolId in multiple files', () => {
    const validator = new RetrievalValidator();
    const a = { ...makeChunk('c1', 'sym-shared'), filePath: 'src/a.ts' };
    const b = { ...makeChunk('c2', 'sym-shared'), filePath: 'src/b.ts' };
    const result = validator.validate([a, b]);
    assert.ok(result.contradictions.length > 0);
    assert.ok(result.contradictions[0].includes('sym-shared'));
  });

  test('valid result when no stale or contradictions', () => {
    const validator = new RetrievalValidator();
    const c1 = makeChunk('c1', 'sym-1');
    const c2 = makeChunk('c2', 'sym-2');
    const result = validator.validate([c1, c2]);
    assert.equal(result.valid, true);
    assert.equal(result.staleArtifacts.length, 0);
    assert.equal(result.contradictions.length, 0);
  });
});

describe('Retrieval active filtering', () => {
  test('excludes stale chunks', () => {
    const results = [makeResult('a', 'sym-a'), makeResult('b', 'sym-b')];
    const { results: out, filtering } = callFilter(results, ['a'], []);
    assert.equal(out.length, 1);
    assert.equal(out[0].chunk.id, 'b');
    assert.equal(filtering.filteredStale, 1);
    assert.equal(filtering.totalAfterFiltering, 1);
  });

  test('excludes contradicted chunks by symbolId', () => {
    const results = [makeResult('x', 'sym-shared'), makeResult('y', 'sym-other')];
    const msg = 'Symbol sym-shared appears in multiple files: src/a.ts, src/b.ts';
    const { results: out, filtering } = callFilter(results, [], [msg]);
    assert.equal(out.length, 1);
    assert.equal(out[0].chunk.symbolId, 'sym-other');
    assert.equal(filtering.filteredContradictions, 1);
  });

  test('preserves traces on filtered-in results', () => {
    const results = [makeResult('a', 'sym-a'), makeResult('b', 'sym-b')];
    const { results: out } = callFilter(results, ['b'], []);
    assert.equal(out[0].trace.retrievalReason, 'semantic_similarity');
    assert.equal(out[0].trace.confidence, 0.9);
  });

  test('filtering stats are correct', () => {
    const results = [
      makeResult('a', 'sym-a'),
      makeResult('b', 'sym-b'),
      makeResult('c', 'sym-shared'),
      makeResult('d', 'sym-d'),
    ];
    const { filtering } = callFilter(results, ['b'], ['Symbol sym-shared appears in multiple files: src/a.ts, src/b.ts']);
    assert.equal(filtering.totalBeforeFiltering, 4);
    assert.equal(filtering.filteredStale, 1);
    assert.equal(filtering.filteredContradictions, 1);
    assert.equal(filtering.totalAfterFiltering, 2);
  });

  test('minTruthLevel STRUCTURAL excludes HEURISTIC and SEMANTIC', () => {
    const results = [
      makeResult('a', 'sym-a', TruthLevel.STRUCTURAL),
      makeResult('b', 'sym-b', TruthLevel.HEURISTIC),
      makeResult('c', 'sym-c', TruthLevel.DERIVED),
    ];
    const { results: out } = callFilter(results, [], [], TruthLevel.STRUCTURAL);
    assert.deepEqual(out.map(r => r.chunk.id), ['a']);
  });

  test('minTruthLevel DERIVED includes STRUCTURAL and DERIVED only', () => {
    const results = [
      makeResult('a', 'sym-a', TruthLevel.STRUCTURAL),
      makeResult('b', 'sym-b', TruthLevel.DERIVED),
      makeResult('c', 'sym-c', TruthLevel.SEMANTIC),
      makeResult('d', 'sym-d', TruthLevel.HEURISTIC),
    ];
    const { results: out } = callFilter(results, [], [], TruthLevel.DERIVED);
    assert.deepEqual(out.map(r => r.chunk.id), ['a', 'b']);
  });

  test('combined stale + minTruthLevel filtering is deterministic', () => {
    const results = [
      makeResult('a', 'sym-a', TruthLevel.STRUCTURAL),
      makeResult('b', 'sym-b', TruthLevel.HEURISTIC),
      makeResult('c', 'sym-c', TruthLevel.STRUCTURAL),
    ];
    const run = () => callFilter(results, ['c'], [], TruthLevel.DERIVED).results.map(r => r.chunk.id);
    assert.deepEqual(run(), run());
    assert.deepEqual(run(), ['a']);
  });
});
