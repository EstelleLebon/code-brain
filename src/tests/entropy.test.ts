import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeEntropyMetrics } from '../retrieval/entropy.js';
import { RetrievalResult, TruthLevel } from '../types/index.js';

function makeResult(id: string, content: string, filePath: string, confidence = 0.8): RetrievalResult {
  return {
    chunk: {
      id: `chunk_${id}`,
      symbolId: `sym_${id}`,
      content,
      hash: `hash_${id}`,
      truthLevel: TruthLevel.STRUCTURAL,
    },
    score: confidence,
    trace: {
      source: filePath,
      retrievalReason: 'semantic_similarity',
      confidence,
      truthLevel: TruthLevel.STRUCTURAL,
    },
  };
}

describe('computeEntropyMetrics', () => {
  test('empty results produce zero scores', () => {
    const metrics = computeEntropyMetrics([]);
    assert.equal(metrics.chunkCount, 0);
    assert.equal(metrics.redundancyScore, 0);
    assert.equal(metrics.overlapScore, 0);
    assert.equal(metrics.diversityScore, 0);
    assert.equal(metrics.signalNoiseRatio, 0);
  });

  test('identical chunks have high redundancy', () => {
    const sameContent = 'function doSomething token authenticate user password hash';
    const results = [
      makeResult('a', sameContent, '/repo/a.ts'),
      makeResult('b', sameContent, '/repo/b.ts'),
      makeResult('c', sameContent, '/repo/c.ts'),
    ];
    const metrics = computeEntropyMetrics(results);
    assert.ok(metrics.redundancyScore > 0.5, `redundancyScore should be high, got ${metrics.redundancyScore}`);
    assert.ok(metrics.overlapScore > 0.5, `overlapScore should be high, got ${metrics.overlapScore}`);
  });

  test('diverse chunks across many files have high diversity', () => {
    const results = [
      makeResult('a', 'function authenticate user password', '/repo/auth.ts'),
      makeResult('b', 'class DatabaseConnection pool query', '/repo/db.ts'),
      makeResult('c', 'interface Config settings options', '/repo/config.ts'),
      makeResult('d', 'const logger winston format', '/repo/logger.ts'),
    ];
    const metrics = computeEntropyMetrics(results);
    // 4 unique files, 4 chunks → diversity = 1.0
    assert.ok(metrics.diversityScore >= 0.9, `diversityScore should be high, got ${metrics.diversityScore}`);
  });

  test('all scores are between 0 and 1', () => {
    const results = [
      makeResult('a', 'function foo bar baz', '/repo/a.ts', 0.9),
      makeResult('b', 'class Widget render update', '/repo/b.ts', 0.7),
      makeResult('c', 'function foo bar baz qux', '/repo/a.ts', 0.5),
    ];
    const metrics = computeEntropyMetrics(results);
    assert.ok(metrics.redundancyScore >= 0 && metrics.redundancyScore <= 1, 'redundancyScore out of range');
    assert.ok(metrics.overlapScore >= 0 && metrics.overlapScore <= 1, 'overlapScore out of range');
    assert.ok(metrics.diversityScore >= 0 && metrics.diversityScore <= 1, 'diversityScore out of range');
    assert.ok(metrics.signalNoiseRatio >= 0 && metrics.signalNoiseRatio <= 1, 'signalNoiseRatio out of range');
  });

  test('single chunk has no redundancy', () => {
    const results = [makeResult('a', 'function foo(): void', '/repo/a.ts', 0.8)];
    const metrics = computeEntropyMetrics(results);
    assert.equal(metrics.redundancyScore, 0);
    assert.equal(metrics.overlapScore, 0);
    assert.equal(metrics.chunkCount, 1);
    assert.equal(metrics.uniqueFileCount, 1);
    assert.equal(metrics.signalNoiseRatio, 0.8);
  });
});
