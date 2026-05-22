"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SemanticExecutor_js_1 = require("../semantic-execution/SemanticExecutor.js");
const ExecutionContext_js_1 = require("../semantic-execution/ExecutionContext.js");
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
const ir = new SemanticIR_js_1.SemanticIR();
(0, node_test_1.describe)('SemanticExecutor — dry run', () => {
    (0, node_test_1.it)('executes rename_symbol in dry-run mode', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const op = ir.createOperation('rename_symbol', ['AuthService']);
        op.payload = { newName: 'AuthenticationService' };
        const transformation = ir.planTransformation([op]);
        const files = new Map([['auth.ts', 'export class AuthService {}\nconst s = new AuthService();']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const result = executor.execute(transformation, ctx);
        strict_1.default.equal(result.dryRun, true);
        strict_1.default.equal(result.success, true);
        const transformed = result.transformedFiles.get('auth.ts');
        strict_1.default.ok(transformed.includes('AuthenticationService'), 'symbol should be renamed in output');
        strict_1.default.ok(!transformed.includes('AuthService'), 'old symbol should be gone');
    });
    (0, node_test_1.it)('plan contains correct step count', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor();
        const op1 = ir.createOperation('rename_symbol', ['foo']);
        op1.payload = { newName: 'bar' };
        const op2 = ir.createOperation('rename_symbol', ['baz']);
        op2.payload = { newName: 'qux' };
        const transformation = ir.planTransformation([op1, op2]);
        const files = new Map([['f.ts', 'export function foo() {}\nexport function baz() {}']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const plan = executor.plan(transformation, ctx);
        strict_1.default.equal(plan.steps.length, 2);
        strict_1.default.ok(plan.totalMutations > 0);
    });
    (0, node_test_1.it)('records replay events on execution', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const op = ir.createOperation('rename_symbol', ['x']);
        op.payload = { newName: 'y' };
        const transformation = ir.planTransformation([op]);
        const files = new Map([['f.ts', 'const x = 1;']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        executor.execute(transformation, ctx);
        strict_1.default.ok(executor.replayLog.size > 0);
    });
    (0, node_test_1.it)('blocked by trust policy in dry-run returns success=true', () => {
        // dry-run always succeeds regardless of trust
        const executor = new SemanticExecutor_js_1.SemanticExecutor();
        const op = ir.createOperation('split_module', ['HugeModule']);
        const transformation = ir.planTransformation([op]);
        const files = new Map([['huge.ts', 'export class HugeModule {}']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const result = executor.execute(transformation, ctx);
        strict_1.default.equal(result.dryRun, true);
        strict_1.default.equal(result.success, true);
    });
    (0, node_test_1.it)('produces semanticDiffs with correct operationType', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const op = ir.createOperation('rename_symbol', ['foo']);
        op.payload = { newName: 'bar' };
        const transformation = ir.planTransformation([op]);
        const files = new Map([['f.ts', 'export function foo() {}']]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', files, true);
        const result = executor.execute(transformation, ctx);
        strict_1.default.ok(result.semanticDiffs.length > 0);
        strict_1.default.equal(result.semanticDiffs[0].operationType, 'rename_symbol');
    });
    (0, node_test_1.it)('risk assessment is present in result', () => {
        const executor = new SemanticExecutor_js_1.SemanticExecutor(TrustPolicy_js_1.PERMISSIVE_TRUST_POLICY);
        const op = ir.createOperation('rename_symbol', ['a']);
        op.payload = { newName: 'b' };
        const transformation = ir.planTransformation([op]);
        const ctx = (0, ExecutionContext_js_1.createExecutionContext)(transformation.id, '/tmp', new Map([['f.ts', 'const a = 1;']]), true);
        const result = executor.execute(transformation, ctx);
        strict_1.default.ok(result.risk.score >= 0);
        strict_1.default.ok(['low', 'medium', 'high', 'critical'].includes(result.risk.level));
    });
});
//# sourceMappingURL=semantic-executor.test.js.map