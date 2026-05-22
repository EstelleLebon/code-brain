import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticDiffEngine } from '../semantic-diff/SemanticDiffEngine.js';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';

const engine = new SemanticDiffEngine();
const ir = new SemanticIR();

describe('SemanticDiffEngine', () => {
  it('detects renamed symbol in operationDiff', () => {
    const original = 'export function foo() { return 1; }';
    const transformed = 'export function bar() { return 1; }';
    const op = ir.createOperation('rename_symbol', ['foo']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'bar' };

    const diff = engine.computeOperationDiff('f.ts', original, transformed, op);
    assert.ok(diff.symbolsRenamed.some(r => r.from === 'foo' && r.to === 'bar'));
  });

  it('detects added symbol', () => {
    const original = 'export function foo() {}';
    const transformed = 'export function foo() {}\nexport function bar() {}';
    const op = ir.createOperation('extract_interface', ['foo']);
    const diff = engine.computeOperationDiff('f.ts', original, transformed, op);
    assert.ok(diff.symbolsAdded.includes('bar'));
  });

  it('computeSemanticDiff includes structural impact', () => {
    const op = ir.createOperation('rename_symbol', ['foo']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'bar' };
    const original = 'export function foo() {}';
    const transformed = 'export function bar() {}';
    const opDiff = engine.computeOperationDiff('f.ts', original, transformed, op);
    const sd = engine.computeSemanticDiff(op, [opDiff]);
    assert.equal(sd.operationType, 'rename_symbol');
    assert.ok(sd.structuralImpact.some(s => s.includes('Renamed')));
  });

  it('summarizeImpact aggregates across files', () => {
    const op = ir.createOperation('rename_symbol', ['foo']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'bar' };
    const diff1 = engine.computeOperationDiff('a.ts', 'export function foo() {}', 'export function bar() {}', op);
    const diff2 = engine.computeOperationDiff('b.ts', 'export function foo() {}', 'export function bar() {}', op);
    const summary = engine.summarizeImpact([diff1, diff2]);
    assert.equal(summary.totalFilesAffected, 2);
    assert.ok(summary.renamedSymbols.length >= 2);
  });
});
