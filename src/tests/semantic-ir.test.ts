import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';

describe('SemanticIR', () => {
  test('createOperation returns operation with correct fields', () => {
    const ir = new SemanticIR();
    const op = ir.createOperation('rename_symbol', ['MyClass'], ['no_external_refs'], ['symbol renamed']);
    assert.equal(op.operationType, 'rename_symbol');
    assert.deepEqual(op.targetSymbols, ['MyClass']);
    assert.deepEqual(op.constraints, ['no_external_refs']);
    assert.deepEqual(op.expectedEffects, ['symbol renamed']);
    assert.ok(op.id.startsWith('op_'));
    assert.ok(op.createdAt > 0);
  });

  test('planTransformation stores and returns transformation', () => {
    const ir = new SemanticIR();
    const op = ir.createOperation('extract_interface', ['ServiceClass']);
    const xfm = ir.planTransformation([op]);
    assert.equal(xfm.status, 'planned');
    assert.equal(xfm.operations.length, 1);
    assert.ok(xfm.id.startsWith('xfm_'));
    assert.equal(ir.getTransformations().length, 1);
  });

  test('validate detects empty targetSymbols', () => {
    const ir = new SemanticIR();
    const op = ir.createOperation('move_function', []);
    const xfm = ir.planTransformation([op]);
    const result = ir.validate(xfm);
    assert.equal(result.valid, false);
    assert.equal(result.issues.length, 1);
  });

  test('validate passes for valid transformation', () => {
    const ir = new SemanticIR();
    const op = ir.createOperation('split_module', ['LargeModule']);
    const xfm = ir.planTransformation([op]);
    const result = ir.validate(xfm);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });
});
