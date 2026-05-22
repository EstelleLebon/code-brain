import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValidationPipeline } from '../validation/ValidationPipeline.js';
import { ValidationContext } from '../validation/types.js';

const pipeline = new ValidationPipeline();

function makeCtx(source: string, transformedSource: string, symbols: string[] = []): ValidationContext {
  return { filePath: 'test.ts', source, transformedSource, affectedSymbols: symbols };
}

describe('ValidationPipeline', () => {
  it('passes when source is unchanged', () => {
    const src = 'export function foo() {}';
    const result = pipeline.run(makeCtx(src, src, ['foo']));
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('detects brace imbalance', () => {
    const result = pipeline.run(makeCtx('{}', 'export function foo() {', ['foo']));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('imbalance')));
  });

  it('detects symbol collision', () => {
    const transformed = 'export function foo() {}\nexport function foo() {}';
    const result = pipeline.run(makeCtx('export function foo() {}', transformed, ['foo']));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('collision')));
  });

  it('passes for valid rename transformation', () => {
    const original = 'export function foo() { return 1; }';
    const transformed = 'export function bar() { return 1; }';
    const result = pipeline.run(makeCtx(original, transformed, ['foo', 'bar']));
    assert.equal(result.valid, true);
  });

  it('accumulates riskScore from multiple issues', () => {
    const result = pipeline.run(makeCtx('{}', 'export function x() {', ['x']));
    assert.ok(result.riskScore > 0);
  });
});
