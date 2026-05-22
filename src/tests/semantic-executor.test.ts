import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticExecutor } from '../semantic-execution/SemanticExecutor.js';
import { createExecutionContext } from '../semantic-execution/ExecutionContext.js';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';
import { PERMISSIVE_TRUST_POLICY } from '../trust/TrustPolicy.js';

const ir = new SemanticIR();

describe('SemanticExecutor — dry run', () => {
  it('executes rename_symbol in dry-run mode', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const op = ir.createOperation('rename_symbol', ['AuthService']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'AuthenticationService' };

    const transformation = ir.planTransformation([op]);
    const files = new Map([['auth.ts', 'export class AuthService {}\nconst s = new AuthService();']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);

    const result = executor.execute(transformation, ctx);

    assert.equal(result.dryRun, true);
    assert.equal(result.success, true);
    const transformed = result.transformedFiles.get('auth.ts')!;
    assert.ok(transformed.includes('AuthenticationService'), 'symbol should be renamed in output');
    assert.ok(!transformed.includes('AuthService'), 'old symbol should be gone');
  });

  it('plan contains correct step count', () => {
    const executor = new SemanticExecutor();
    const op1 = ir.createOperation('rename_symbol', ['foo']);
    (op1 as unknown as Record<string, unknown>).payload = { newName: 'bar' };
    const op2 = ir.createOperation('rename_symbol', ['baz']);
    (op2 as unknown as Record<string, unknown>).payload = { newName: 'qux' };

    const transformation = ir.planTransformation([op1, op2]);
    const files = new Map([['f.ts', 'export function foo() {}\nexport function baz() {}']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);

    const plan = executor.plan(transformation, ctx);
    assert.equal(plan.steps.length, 2);
    assert.ok(plan.totalMutations > 0);
  });

  it('records replay events on execution', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const op = ir.createOperation('rename_symbol', ['x']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'y' };
    const transformation = ir.planTransformation([op]);
    const files = new Map([['f.ts', 'const x = 1;']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);

    executor.execute(transformation, ctx);
    assert.ok(executor.replayLog.size > 0);
  });

  it('blocked by trust policy in dry-run returns success=true', () => {
    // dry-run always succeeds regardless of trust
    const executor = new SemanticExecutor();
    const op = ir.createOperation('split_module', ['HugeModule']);
    const transformation = ir.planTransformation([op]);
    const files = new Map([['huge.ts', 'export class HugeModule {}']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);
    const result = executor.execute(transformation, ctx);
    assert.equal(result.dryRun, true);
    assert.equal(result.success, true);
  });

  it('produces semanticDiffs with correct operationType', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const op = ir.createOperation('rename_symbol', ['foo']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'bar' };
    const transformation = ir.planTransformation([op]);
    const files = new Map([['f.ts', 'export function foo() {}']]);
    const ctx = createExecutionContext(transformation.id, '/tmp', files, true);
    const result = executor.execute(transformation, ctx);
    assert.ok(result.semanticDiffs.length > 0);
    assert.equal(result.semanticDiffs[0]!.operationType, 'rename_symbol');
  });

  it('risk assessment is present in result', () => {
    const executor = new SemanticExecutor(PERMISSIVE_TRUST_POLICY);
    const op = ir.createOperation('rename_symbol', ['a']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'b' };
    const transformation = ir.planTransformation([op]);
    const ctx = createExecutionContext(transformation.id, '/tmp', new Map([['f.ts', 'const a = 1;']]), true);
    const result = executor.execute(transformation, ctx);
    assert.ok(result.risk.score >= 0);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(result.risk.level));
  });
});
