import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ASTTransformer } from '../ast-runtime/ASTTransformer.js';
import { ASTSerializer } from '../ast-runtime/ASTSerializer.js';
import { TransformationEngine } from '../ast-runtime/TransformationEngine.js';
import { SemanticIR } from '../semantic-ir/SemanticIR.js';

const ir = new SemanticIR();
const engine = new TransformationEngine();
const transformer = new ASTTransformer();
const serializer = new ASTSerializer();

describe('ASTTransformer', () => {
  it('applies a single mutation', () => {
    const source = 'export function foo() {}';
    const result = transformer.apply(source, [{
      filePath: 'test.ts',
      startIndex: 16,
      endIndex: 19,
      replacement: 'bar',
      reason: 'rename foo→bar',
    }]);
    assert.equal(result.source, 'export function bar() {}');
    assert.equal(result.changed, true);
    assert.equal(result.appliedCount, 1);
  });

  it('applies multiple mutations in reverse order', () => {
    const source = 'const a = 1; const b = 2;';
    const result = transformer.apply(source, [
      { filePath: 'f.ts', startIndex: 6, endIndex: 7, replacement: 'alpha', reason: 'r1' },
      { filePath: 'f.ts', startIndex: 19, endIndex: 20, replacement: 'beta', reason: 'r2' },
    ]);
    assert.equal(result.source, 'const alpha = 1; const beta = 2;');
    assert.equal(result.appliedCount, 2);
  });

  it('returns unchanged when no mutations', () => {
    const source = 'const x = 1;';
    const result = transformer.apply(source, []);
    assert.equal(result.changed, false);
    assert.equal(result.source, source);
  });
});

describe('ASTSerializer', () => {
  it('serializes source with metadata', () => {
    const out = serializer.serialize('src/foo.ts', 'const x = 1;\n');
    assert.equal(out.filePath, 'src/foo.ts');
    assert.equal(out.lineCount, 2);
    assert.ok(out.byteSize > 0);
  });
});

describe('TransformationEngine — rename_symbol', () => {
  it('generates mutations for rename_symbol via regex fallback', () => {
    const op = ir.createOperation('rename_symbol', ['AuthService']);
    (op as unknown as Record<string, unknown>).payload = { newName: 'AuthenticationService' };

    const source = 'class AuthService {}\nconst svc = new AuthService();';
    const mutations = engine.planMutations(op, { filePath: 'auth.ts', source });

    assert.ok(mutations.length > 0, 'should produce mutations');
    const result = transformer.apply(source, mutations);
    assert.ok(!result.source.includes('AuthService'), 'old name should be gone');
    assert.ok(result.source.includes('AuthenticationService'), 'new name should appear');
  });

  it('returns empty when no targetSymbols', () => {
    const op = ir.createOperation('rename_symbol', []);
    const mutations = engine.planMutations(op, { filePath: 'f.ts', source: 'const x = 1;' });
    assert.equal(mutations.length, 0);
  });

  it('extract_interface returns array', () => {
    const source = `export class UserRepo {\n  findById(id: string) {}\n}`;
    const op = ir.createOperation('extract_interface', ['UserRepo']);
    const mutations = engine.planMutations(op, { filePath: 'repo.ts', source });
    assert.ok(Array.isArray(mutations));
  });
});
