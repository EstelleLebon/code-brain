"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ASTTransformer_js_1 = require("../ast-runtime/ASTTransformer.js");
const ASTSerializer_js_1 = require("../ast-runtime/ASTSerializer.js");
const TransformationEngine_js_1 = require("../ast-runtime/TransformationEngine.js");
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
const ir = new SemanticIR_js_1.SemanticIR();
const engine = new TransformationEngine_js_1.TransformationEngine();
const transformer = new ASTTransformer_js_1.ASTTransformer();
const serializer = new ASTSerializer_js_1.ASTSerializer();
(0, node_test_1.describe)('ASTTransformer', () => {
    (0, node_test_1.it)('applies a single mutation', () => {
        const source = 'export function foo() {}';
        const result = transformer.apply(source, [{
                filePath: 'test.ts',
                startIndex: 16,
                endIndex: 19,
                replacement: 'bar',
                reason: 'rename foo→bar',
            }]);
        strict_1.default.equal(result.source, 'export function bar() {}');
        strict_1.default.equal(result.changed, true);
        strict_1.default.equal(result.appliedCount, 1);
    });
    (0, node_test_1.it)('applies multiple mutations in reverse order', () => {
        const source = 'const a = 1; const b = 2;';
        const result = transformer.apply(source, [
            { filePath: 'f.ts', startIndex: 6, endIndex: 7, replacement: 'alpha', reason: 'r1' },
            { filePath: 'f.ts', startIndex: 19, endIndex: 20, replacement: 'beta', reason: 'r2' },
        ]);
        strict_1.default.equal(result.source, 'const alpha = 1; const beta = 2;');
        strict_1.default.equal(result.appliedCount, 2);
    });
    (0, node_test_1.it)('returns unchanged when no mutations', () => {
        const source = 'const x = 1;';
        const result = transformer.apply(source, []);
        strict_1.default.equal(result.changed, false);
        strict_1.default.equal(result.source, source);
    });
});
(0, node_test_1.describe)('ASTSerializer', () => {
    (0, node_test_1.it)('serializes source with metadata', () => {
        const out = serializer.serialize('src/foo.ts', 'const x = 1;\n');
        strict_1.default.equal(out.filePath, 'src/foo.ts');
        strict_1.default.equal(out.lineCount, 2);
        strict_1.default.ok(out.byteSize > 0);
    });
});
(0, node_test_1.describe)('TransformationEngine — rename_symbol', () => {
    (0, node_test_1.it)('generates mutations for rename_symbol via regex fallback', () => {
        const op = ir.createOperation('rename_symbol', ['AuthService']);
        op.payload = { newName: 'AuthenticationService' };
        const source = 'class AuthService {}\nconst svc = new AuthService();';
        const mutations = engine.planMutations(op, { filePath: 'auth.ts', source });
        strict_1.default.ok(mutations.length > 0, 'should produce mutations');
        const result = transformer.apply(source, mutations);
        strict_1.default.ok(!result.source.includes('AuthService'), 'old name should be gone');
        strict_1.default.ok(result.source.includes('AuthenticationService'), 'new name should appear');
    });
    (0, node_test_1.it)('returns empty when no targetSymbols', () => {
        const op = ir.createOperation('rename_symbol', []);
        const mutations = engine.planMutations(op, { filePath: 'f.ts', source: 'const x = 1;' });
        strict_1.default.equal(mutations.length, 0);
    });
    (0, node_test_1.it)('extract_interface returns array', () => {
        const source = `export class UserRepo {\n  findById(id: string) {}\n}`;
        const op = ir.createOperation('extract_interface', ['UserRepo']);
        const mutations = engine.planMutations(op, { filePath: 'repo.ts', source });
        strict_1.default.ok(Array.isArray(mutations));
    });
});
//# sourceMappingURL=ast-runtime.test.js.map