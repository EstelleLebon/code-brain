"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("../types/index.js");
const retrieval_js_1 = require("../retrieval/retrieval.js");
const RetrievalValidator_js_1 = require("../retrieval/validation/RetrievalValidator.js");
// Minimal chunk factory
function makeChunk(id, symbolId, truthLevel = index_js_1.TruthLevel.STRUCTURAL, invalidatedAt) {
    return {
        id,
        symbolId,
        content: `content-${id}`,
        embedding: [],
        truthLevel,
        createdAt: Date.now(),
        ...(invalidatedAt !== undefined ? { invalidatedAt } : {}),
        filePath: `src/${id}.ts`,
    };
}
function makeResult(chunkId, symbolId, truthLevel = index_js_1.TruthLevel.STRUCTURAL) {
    return {
        chunk: makeChunk(chunkId, symbolId, truthLevel),
        score: 0.9,
        trace: { source: `src/${chunkId}.ts`, retrievalReason: 'semantic_similarity', confidence: 0.9, truthLevel },
    };
}
// Access private filterResults via casting
function callFilter(results, staleIds, contradictions, minTruthLevel) {
    const r = new retrieval_js_1.Retrieval(null, null, null, { time: (_k, fn) => fn(), log: () => { }, metric: () => { } });
    return r.filterResults(results, staleIds, contradictions, minTruthLevel);
}
(0, node_test_1.describe)('isTruthLevelAtLeast', () => {
    (0, node_test_1.test)('STRUCTURAL satisfies any minLevel', () => {
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.STRUCTURAL, index_js_1.TruthLevel.HEURISTIC), true);
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.STRUCTURAL, index_js_1.TruthLevel.STRUCTURAL), true);
    });
    (0, node_test_1.test)('HEURISTIC only satisfies HEURISTIC minimum', () => {
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.HEURISTIC, index_js_1.TruthLevel.HEURISTIC), true);
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.HEURISTIC, index_js_1.TruthLevel.SEMANTIC), false);
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.HEURISTIC, index_js_1.TruthLevel.STRUCTURAL), false);
    });
    (0, node_test_1.test)('DERIVED satisfies DERIVED and above', () => {
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.DERIVED, index_js_1.TruthLevel.STRUCTURAL), false);
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.DERIVED, index_js_1.TruthLevel.DERIVED), true);
        strict_1.default.equal((0, retrieval_js_1.isTruthLevelAtLeast)(index_js_1.TruthLevel.DERIVED, index_js_1.TruthLevel.HEURISTIC), true);
    });
});
(0, node_test_1.describe)('RetrievalValidator stale detection', () => {
    (0, node_test_1.test)('detects stale chunks with invalidatedAt', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const stale = makeChunk('stale-1', 'sym-1', index_js_1.TruthLevel.STRUCTURAL, Date.now() - 1000);
        const fresh = makeChunk('fresh-1', 'sym-2', index_js_1.TruthLevel.STRUCTURAL);
        const result = validator.validate([stale, fresh]);
        strict_1.default.ok(result.staleArtifacts.includes('stale-1'));
        strict_1.default.ok(!result.staleArtifacts.includes('fresh-1'));
    });
    (0, node_test_1.test)('detects contradiction when same symbolId in multiple files', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const a = { ...makeChunk('c1', 'sym-shared'), filePath: 'src/a.ts' };
        const b = { ...makeChunk('c2', 'sym-shared'), filePath: 'src/b.ts' };
        const result = validator.validate([a, b]);
        strict_1.default.ok(result.contradictions.length > 0);
        strict_1.default.ok(result.contradictions[0].includes('sym-shared'));
    });
    (0, node_test_1.test)('valid result when no stale or contradictions', () => {
        const validator = new RetrievalValidator_js_1.RetrievalValidator();
        const c1 = makeChunk('c1', 'sym-1');
        const c2 = makeChunk('c2', 'sym-2');
        const result = validator.validate([c1, c2]);
        strict_1.default.equal(result.valid, true);
        strict_1.default.equal(result.staleArtifacts.length, 0);
        strict_1.default.equal(result.contradictions.length, 0);
    });
});
(0, node_test_1.describe)('Retrieval active filtering', () => {
    (0, node_test_1.test)('excludes stale chunks', () => {
        const results = [makeResult('a', 'sym-a'), makeResult('b', 'sym-b')];
        const { results: out, filtering } = callFilter(results, ['a'], []);
        strict_1.default.equal(out.length, 1);
        strict_1.default.equal(out[0].chunk.id, 'b');
        strict_1.default.equal(filtering.filteredStale, 1);
        strict_1.default.equal(filtering.totalAfterFiltering, 1);
    });
    (0, node_test_1.test)('excludes contradicted chunks by symbolId', () => {
        const results = [makeResult('x', 'sym-shared'), makeResult('y', 'sym-other')];
        const msg = 'Symbol sym-shared appears in multiple files: src/a.ts, src/b.ts';
        const { results: out, filtering } = callFilter(results, [], [msg]);
        strict_1.default.equal(out.length, 1);
        strict_1.default.equal(out[0].chunk.symbolId, 'sym-other');
        strict_1.default.equal(filtering.filteredContradictions, 1);
    });
    (0, node_test_1.test)('preserves traces on filtered-in results', () => {
        const results = [makeResult('a', 'sym-a'), makeResult('b', 'sym-b')];
        const { results: out } = callFilter(results, ['b'], []);
        strict_1.default.equal(out[0].trace.retrievalReason, 'semantic_similarity');
        strict_1.default.equal(out[0].trace.confidence, 0.9);
    });
    (0, node_test_1.test)('filtering stats are correct', () => {
        const results = [
            makeResult('a', 'sym-a'),
            makeResult('b', 'sym-b'),
            makeResult('c', 'sym-shared'),
            makeResult('d', 'sym-d'),
        ];
        const { filtering } = callFilter(results, ['b'], ['Symbol sym-shared appears in multiple files: src/a.ts, src/b.ts']);
        strict_1.default.equal(filtering.totalBeforeFiltering, 4);
        strict_1.default.equal(filtering.filteredStale, 1);
        strict_1.default.equal(filtering.filteredContradictions, 1);
        strict_1.default.equal(filtering.totalAfterFiltering, 2);
    });
    (0, node_test_1.test)('minTruthLevel STRUCTURAL excludes HEURISTIC and SEMANTIC', () => {
        const results = [
            makeResult('a', 'sym-a', index_js_1.TruthLevel.STRUCTURAL),
            makeResult('b', 'sym-b', index_js_1.TruthLevel.HEURISTIC),
            makeResult('c', 'sym-c', index_js_1.TruthLevel.DERIVED),
        ];
        const { results: out } = callFilter(results, [], [], index_js_1.TruthLevel.STRUCTURAL);
        strict_1.default.deepEqual(out.map(r => r.chunk.id), ['a']);
    });
    (0, node_test_1.test)('minTruthLevel DERIVED includes STRUCTURAL and DERIVED only', () => {
        const results = [
            makeResult('a', 'sym-a', index_js_1.TruthLevel.STRUCTURAL),
            makeResult('b', 'sym-b', index_js_1.TruthLevel.DERIVED),
            makeResult('c', 'sym-c', index_js_1.TruthLevel.SEMANTIC),
            makeResult('d', 'sym-d', index_js_1.TruthLevel.HEURISTIC),
        ];
        const { results: out } = callFilter(results, [], [], index_js_1.TruthLevel.DERIVED);
        strict_1.default.deepEqual(out.map(r => r.chunk.id), ['a', 'b']);
    });
    (0, node_test_1.test)('combined stale + minTruthLevel filtering is deterministic', () => {
        const results = [
            makeResult('a', 'sym-a', index_js_1.TruthLevel.STRUCTURAL),
            makeResult('b', 'sym-b', index_js_1.TruthLevel.HEURISTIC),
            makeResult('c', 'sym-c', index_js_1.TruthLevel.STRUCTURAL),
        ];
        const run = () => callFilter(results, ['c'], [], index_js_1.TruthLevel.DERIVED).results.map(r => r.chunk.id);
        strict_1.default.deepEqual(run(), run());
        strict_1.default.deepEqual(run(), ['a']);
    });
});
//# sourceMappingURL=retrieval-filtering.test.js.map