"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const entropy_js_1 = require("../retrieval/entropy.js");
const index_js_1 = require("../types/index.js");
function makeResult(id, content, filePath, confidence = 0.8) {
    return {
        chunk: {
            id: `chunk_${id}`,
            symbolId: `sym_${id}`,
            content,
            hash: `hash_${id}`,
            truthLevel: index_js_1.TruthLevel.STRUCTURAL,
        },
        score: confidence,
        trace: {
            source: filePath,
            retrievalReason: 'semantic_similarity',
            confidence,
            truthLevel: index_js_1.TruthLevel.STRUCTURAL,
        },
    };
}
(0, node_test_1.describe)('computeEntropyMetrics', () => {
    (0, node_test_1.test)('empty results produce zero scores', () => {
        const metrics = (0, entropy_js_1.computeEntropyMetrics)([]);
        strict_1.default.equal(metrics.chunkCount, 0);
        strict_1.default.equal(metrics.redundancyScore, 0);
        strict_1.default.equal(metrics.overlapScore, 0);
        strict_1.default.equal(metrics.diversityScore, 0);
        strict_1.default.equal(metrics.signalNoiseRatio, 0);
    });
    (0, node_test_1.test)('identical chunks have high redundancy', () => {
        const sameContent = 'function doSomething token authenticate user password hash';
        const results = [
            makeResult('a', sameContent, '/repo/a.ts'),
            makeResult('b', sameContent, '/repo/b.ts'),
            makeResult('c', sameContent, '/repo/c.ts'),
        ];
        const metrics = (0, entropy_js_1.computeEntropyMetrics)(results);
        strict_1.default.ok(metrics.redundancyScore > 0.5, `redundancyScore should be high, got ${metrics.redundancyScore}`);
        strict_1.default.ok(metrics.overlapScore > 0.5, `overlapScore should be high, got ${metrics.overlapScore}`);
    });
    (0, node_test_1.test)('diverse chunks across many files have high diversity', () => {
        const results = [
            makeResult('a', 'function authenticate user password', '/repo/auth.ts'),
            makeResult('b', 'class DatabaseConnection pool query', '/repo/db.ts'),
            makeResult('c', 'interface Config settings options', '/repo/config.ts'),
            makeResult('d', 'const logger winston format', '/repo/logger.ts'),
        ];
        const metrics = (0, entropy_js_1.computeEntropyMetrics)(results);
        // 4 unique files, 4 chunks → diversity = 1.0
        strict_1.default.ok(metrics.diversityScore >= 0.9, `diversityScore should be high, got ${metrics.diversityScore}`);
    });
    (0, node_test_1.test)('all scores are between 0 and 1', () => {
        const results = [
            makeResult('a', 'function foo bar baz', '/repo/a.ts', 0.9),
            makeResult('b', 'class Widget render update', '/repo/b.ts', 0.7),
            makeResult('c', 'function foo bar baz qux', '/repo/a.ts', 0.5),
        ];
        const metrics = (0, entropy_js_1.computeEntropyMetrics)(results);
        strict_1.default.ok(metrics.redundancyScore >= 0 && metrics.redundancyScore <= 1, 'redundancyScore out of range');
        strict_1.default.ok(metrics.overlapScore >= 0 && metrics.overlapScore <= 1, 'overlapScore out of range');
        strict_1.default.ok(metrics.diversityScore >= 0 && metrics.diversityScore <= 1, 'diversityScore out of range');
        strict_1.default.ok(metrics.signalNoiseRatio >= 0 && metrics.signalNoiseRatio <= 1, 'signalNoiseRatio out of range');
    });
    (0, node_test_1.test)('single chunk has no redundancy', () => {
        const results = [makeResult('a', 'function foo(): void', '/repo/a.ts', 0.8)];
        const metrics = (0, entropy_js_1.computeEntropyMetrics)(results);
        strict_1.default.equal(metrics.redundancyScore, 0);
        strict_1.default.equal(metrics.overlapScore, 0);
        strict_1.default.equal(metrics.chunkCount, 1);
        strict_1.default.equal(metrics.uniqueFileCount, 1);
        strict_1.default.equal(metrics.signalNoiseRatio, 0.8);
    });
});
//# sourceMappingURL=entropy.test.js.map