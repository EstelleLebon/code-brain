"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SemanticDiffEngine_js_1 = require("../semantic-diff/SemanticDiffEngine.js");
const SemanticIR_js_1 = require("../semantic-ir/SemanticIR.js");
const engine = new SemanticDiffEngine_js_1.SemanticDiffEngine();
const ir = new SemanticIR_js_1.SemanticIR();
(0, node_test_1.describe)('SemanticDiffEngine', () => {
    (0, node_test_1.it)('detects renamed symbol in operationDiff', () => {
        const original = 'export function foo() { return 1; }';
        const transformed = 'export function bar() { return 1; }';
        const op = ir.createOperation('rename_symbol', ['foo']);
        op.payload = { newName: 'bar' };
        const diff = engine.computeOperationDiff('f.ts', original, transformed, op);
        strict_1.default.ok(diff.symbolsRenamed.some(r => r.from === 'foo' && r.to === 'bar'));
    });
    (0, node_test_1.it)('detects added symbol', () => {
        const original = 'export function foo() {}';
        const transformed = 'export function foo() {}\nexport function bar() {}';
        const op = ir.createOperation('extract_interface', ['foo']);
        const diff = engine.computeOperationDiff('f.ts', original, transformed, op);
        strict_1.default.ok(diff.symbolsAdded.includes('bar'));
    });
    (0, node_test_1.it)('computeSemanticDiff includes structural impact', () => {
        const op = ir.createOperation('rename_symbol', ['foo']);
        op.payload = { newName: 'bar' };
        const original = 'export function foo() {}';
        const transformed = 'export function bar() {}';
        const opDiff = engine.computeOperationDiff('f.ts', original, transformed, op);
        const sd = engine.computeSemanticDiff(op, [opDiff]);
        strict_1.default.equal(sd.operationType, 'rename_symbol');
        strict_1.default.ok(sd.structuralImpact.some(s => s.includes('Renamed')));
    });
    (0, node_test_1.it)('summarizeImpact aggregates across files', () => {
        const op = ir.createOperation('rename_symbol', ['foo']);
        op.payload = { newName: 'bar' };
        const diff1 = engine.computeOperationDiff('a.ts', 'export function foo() {}', 'export function bar() {}', op);
        const diff2 = engine.computeOperationDiff('b.ts', 'export function foo() {}', 'export function bar() {}', op);
        const summary = engine.summarizeImpact([diff1, diff2]);
        strict_1.default.equal(summary.totalFilesAffected, 2);
        strict_1.default.ok(summary.renamedSymbols.length >= 2);
    });
});
//# sourceMappingURL=semantic-diff.test.js.map