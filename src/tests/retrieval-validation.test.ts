import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RetrievalValidator } from '../retrieval/validation/RetrievalValidator.js';
import { SemanticChunk, TruthLevel } from '../types/index.js';

function makeChunk(id: string, symbolId: string, filePath: string, overrides: Partial<SemanticChunk & { invalidatedAt?: number; filePath?: string }> = {}): SemanticChunk & { filePath: string; invalidatedAt?: number } {
  return {
    id,
    symbolId,
    content: `content of ${id}`,
    hash: `hash_${id}`,
    truthLevel: TruthLevel.STRUCTURAL,
    filePath,
    ...overrides,
  } as SemanticChunk & { filePath: string; invalidatedAt?: number };
}

describe('RetrievalValidator', () => {
  test('valid result when no stale or contradictions', () => {
    const validator = new RetrievalValidator();
    const chunks = [
      makeChunk('c1', 'sym1', '/a/file.ts'),
      makeChunk('c2', 'sym2', '/b/file.ts'),
    ];
    const result = validator.validate(chunks);
    assert.equal(result.valid, true);
    assert.deepEqual(result.staleArtifacts, []);
    assert.deepEqual(result.contradictions, []);
    assert.deepEqual(result.warnings, []);
  });

  test('stale detection when invalidatedAt is set', () => {
    const validator = new RetrievalValidator();
    const chunks = [
      makeChunk('c1', 'sym1', '/a/file.ts', { invalidatedAt: Date.now() }),
      makeChunk('c2', 'sym2', '/b/file.ts'),
    ];
    const result = validator.validate(chunks);
    assert.equal(result.valid, false);
    assert.ok(result.staleArtifacts.includes('c1'));
    assert.equal(result.staleArtifacts.length, 1);
  });

  test('contradiction detection when same symbolId in multiple files', () => {
    const validator = new RetrievalValidator();
    const chunks = [
      makeChunk('c1', 'sym-shared', '/a/file.ts'),
      makeChunk('c2', 'sym-shared', '/b/other.ts'),
    ];
    const result = validator.validate(chunks);
    assert.equal(result.valid, false);
    assert.equal(result.contradictions.length, 1);
    assert.ok(result.contradictions[0]!.includes('sym-shared'));
  });

  test('warning for HEURISTIC truth level', () => {
    const validator = new RetrievalValidator();
    const chunks = [
      makeChunk('c1', 'sym1', '/a/file.ts', { truthLevel: TruthLevel.HEURISTIC }),
    ];
    const result = validator.validate(chunks);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0]!.includes('c1'));
    assert.ok(result.warnings[0]!.includes('HEURISTIC'));
    // warnings alone don't make it invalid
    assert.equal(result.valid, true);
  });
});
