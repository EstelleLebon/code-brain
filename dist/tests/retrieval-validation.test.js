"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const RetrievalValidator_js_1 = require("../retrieval/validation/RetrievalValidator.js");
const index_js_1 = require("../types/index.js");
function makeChunk(id, symbolId, filePath, overrides = {}) {
    return {
        id,
        symbolId,
        content: `content of ${id}`,
        hash: `hash_${id}`,
        truthLevel: index_js_1.TruthLevel.STRUCTURAL,
        filePath,
        ...overrides,
    };
}
(0, node_test_1.describe)('RetrievalValidator', () => {
    (0, node_test_1.test)('valid result when no stale or contradictions', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const chunks = [
            makeChunk('c1', 'sym1', '/a/file.ts'),
            makeChunk('c2', 'sym2', '/b/file.ts'),
        ];
        const result = validator.validate(chunks);
        strict_1.default.equal(result.valid, true);
        strict_1.default.deepEqual(result.staleArtifacts, []);
        strict_1.default.deepEqual(result.contradictions, []);
        strict_1.default.deepEqual(result.warnings, []);
    });
    (0, node_test_1.test)('stale detection when invalidatedAt is set', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const chunks = [
            makeChunk('c1', 'sym1', '/a/file.ts', { invalidatedAt: Date.now() }),
            makeChunk('c2', 'sym2', '/b/file.ts'),
        ];
        const result = validator.validate(chunks);
        strict_1.default.equal(result.valid, false);
        strict_1.default.ok(result.staleArtifacts.includes('c1'));
        strict_1.default.equal(result.staleArtifacts.length, 1);
    });
    (0, node_test_1.test)('contradiction detection when same symbolId in multiple files', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const chunks = [
            makeChunk('c1', 'sym-shared', '/a/file.ts'),
            makeChunk('c2', 'sym-shared', '/b/other.ts'),
        ];
        const result = validator.validate(chunks);
        strict_1.default.equal(result.valid, false);
        strict_1.default.equal(result.contradictions.length, 1);
        strict_1.default.ok(result.contradictions[0].includes('sym-shared'));
    });
    (0, node_test_1.test)('warning for HEURISTIC truth level', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const chunks = [
            makeChunk('c1', 'sym1', '/a/file.ts', { truthLevel: index_js_1.TruthLevel.HEURISTIC }),
        ];
        const result = validator.validate(chunks);
        strict_1.default.equal(result.warnings.length, 1);
        strict_1.default.ok(result.warnings[0].includes('c1'));
        strict_1.default.ok(result.warnings[0].includes('HEURISTIC'));
        // warnings alone don't make it invalid
        strict_1.default.equal(result.valid, true);
    });
});
//# sourceMappingURL=retrieval-validation.test.js.map