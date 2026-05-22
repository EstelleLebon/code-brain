"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ValidationPipeline_js_1 = require("../validation/ValidationPipeline.js");
const pipeline = new ValidationPipeline_js_1.ValidationPipeline();
function makeCtx(source, transformedSource, symbols = []) {
    return { filePath: 'test.ts', source, transformedSource, affectedSymbols: symbols };
}
(0, node_test_1.describe)('ValidationPipeline', () => {
    (0, node_test_1.it)('passes when source is unchanged', () => {
        const src = 'export function foo() {}';
        const result = pipeline.run(makeCtx(src, src, ['foo']));
        strict_1.default.equal(result.valid, true);
        strict_1.default.equal(result.errors.length, 0);
    });
    (0, node_test_1.it)('detects brace imbalance', () => {
        const result = pipeline.run(makeCtx('{}', 'export function foo() {', ['foo']));
        strict_1.default.equal(result.valid, false);
        strict_1.default.ok(result.errors.some(e => e.includes('imbalance')));
    });
    (0, node_test_1.it)('detects symbol collision', () => {
        const transformed = 'export function foo() {}\nexport function foo() {}';
        const result = pipeline.run(makeCtx('export function foo() {}', transformed, ['foo']));
        strict_1.default.equal(result.valid, false);
        strict_1.default.ok(result.errors.some(e => e.includes('collision')));
    });
    (0, node_test_1.it)('passes for valid rename transformation', () => {
        const original = 'export function foo() { return 1; }';
        const transformed = 'export function bar() { return 1; }';
        const result = pipeline.run(makeCtx(original, transformed, ['foo', 'bar']));
        strict_1.default.equal(result.valid, true);
    });
    (0, node_test_1.it)('accumulates riskScore from multiple issues', () => {
        const result = pipeline.run(makeCtx('{}', 'export function x() {', ['x']));
        strict_1.default.ok(result.riskScore > 0);
    });
});
//# sourceMappingURL=validation.test.js.map