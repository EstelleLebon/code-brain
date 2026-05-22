"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
(0, node_test_1.describe)('SemanticIR', () => {
    (0, node_test_1.test)('createOperation returns operation with correct fields', () => {
        const ir = new SemanticIR_js_1.SemanticIR();
        const op = ir.createOperation('rename_symbol', ['MyClass'], ['no_external_refs'], ['symbol renamed']);
        strict_1.default.equal(op.operationType, 'rename_symbol');
        strict_1.default.deepEqual(op.targetSymbols, ['MyClass']);
        strict_1.default.deepEqual(op.constraints, ['no_external_refs']);
        strict_1.default.deepEqual(op.expectedEffects, ['symbol renamed']);
        strict_1.default.ok(op.id.startsWith('op_'));
        strict_1.default.ok(op.createdAt > 0);
    });
    (0, node_test_1.test)('planTransformation stores and returns transformation', () => {
        const ir = new SemanticIR_js_1.SemanticIR();
        const op = ir.createOperation('extract_interface', ['ServiceClass']);
        const xfm = ir.planTransformation([op]);
        strict_1.default.equal(xfm.status, 'planned');
        strict_1.default.equal(xfm.operations.length, 1);
        strict_1.default.ok(xfm.id.startsWith('xfm_'));
        strict_1.default.equal(ir.getTransformations().length, 1);
    });
    (0, node_test_1.test)('validate detects empty targetSymbols', () => {
        const ir = new SemanticIR_js_1.SemanticIR();
        const op = ir.createOperation('move_function', []);
        const xfm = ir.planTransformation([op]);
        const result = ir.validate(xfm);
        strict_1.default.equal(result.valid, false);
        strict_1.default.equal(result.issues.length, 1);
    });
    (0, node_test_1.test)('validate passes for valid transformation', () => {
        const ir = new SemanticIR_js_1.SemanticIR();
        const op = ir.createOperation('split_module', ['LargeModule']);
        const xfm = ir.planTransformation([op]);
        const result = ir.validate(xfm);
        strict_1.default.equal(result.valid, true);
        strict_1.default.equal(result.issues.length, 0);
    });
});
//# sourceMappingURL=semantic-ir.test.js.map