"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const node_fs_1 = __importDefault(require("node:fs"));
const db_js_1 = require("../persistence/db.js");
const dependency_graph_js_1 = require("../graph/dependency-graph.js");
const telemetry_js_1 = require("../telemetry/telemetry.js");
const InvalidationEngine_js_1 = require("../invalidation/InvalidationEngine.js");
const index_js_1 = require("../types/index.js");
function makeTempDb() {
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'code-brain-inv-test-'));
    const dbPath = node_path_1.default.join(dir, 'test.db');
    const db = new db_js_1.DB(dbPath);
    return {
        db,
        cleanup: () => {
            db.close();
            node_fs_1.default.rmSync(dir, { recursive: true, force: true });
        },
    };
}
function makeSymbol(id, name, filePath) {
    const now = Date.now();
    return {
        id,
        name,
        kind: 'function',
        filePath,
        startLine: 1,
        endLine: 10,
        signature: `function ${name}(): void`,
        exported: true,
        dependencies: [],
        hash: id.slice(0, 16),
        createdAt: now,
        updatedAt: now,
    };
}
(0, node_test_1.describe)('InvalidationEngine', () => {
    (0, node_test_1.test)('propagates invalidation A→B→C: changing A impacts B and C', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const graph = new dependency_graph_js_1.DependencyGraph();
            const telemetry = new telemetry_js_1.Telemetry(false);
            // Set up symbols A→B→C
            const symA = makeSymbol('aaaaaaaaaaaaaaaa', 'funcA', '/repo/a.ts');
            const symB = makeSymbol('bbbbbbbbbbbbbbbb', 'funcB', '/repo/b.ts');
            const symC = makeSymbol('cccccccccccccccc', 'funcC', '/repo/c.ts');
            db.insertSymbol(symA);
            db.insertSymbol(symB);
            db.insertSymbol(symC);
            graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });
            graph.addEdge({ fromId: symB.id, toId: symC.id, kind: 'import' });
            // Insert claims for B and C
            db.insertClaim({
                id: 'claim_b_001',
                symbolId: symB.id,
                claim: 'Symbol is exported',
                confidence: 1.0,
                sourceHash: symB.hash,
                truthLevel: index_js_1.TruthLevel.DERIVED,
            });
            db.insertClaim({
                id: 'claim_c_001',
                symbolId: symC.id,
                claim: 'Symbol is exported',
                confidence: 1.0,
                sourceHash: symC.hash,
                truthLevel: index_js_1.TruthLevel.DERIVED,
            });
            // Insert chunks for B and C
            db.insertChunk({
                id: 'chunk_b_001',
                symbolId: symB.id,
                content: 'function funcB(): void {}',
                hash: 'hashb001',
                truthLevel: index_js_1.TruthLevel.STRUCTURAL,
            });
            db.insertChunk({
                id: 'chunk_c_001',
                symbolId: symC.id,
                content: 'function funcC(): void {}',
                hash: 'hashc001',
                truthLevel: index_js_1.TruthLevel.STRUCTURAL,
            });
            const engine = new InvalidationEngine_js_1.InvalidationEngine(db, graph, telemetry);
            const result = engine.propagate({
                filePath: '/repo/a.ts',
                symbolIds: [symA.id],
                timestamp: Date.now(),
                reason: 'file_changed',
            });
            // B and C should be in impacted symbols
            strict_1.default.ok(result.invalidatedSymbols.includes(symB.id), 'B should be invalidated');
            strict_1.default.ok(result.invalidatedSymbols.includes(symC.id), 'C should be invalidated');
            // Claims for B and C should be invalidated
            strict_1.default.ok(result.invalidatedClaims.includes('claim_b_001'), 'claim for B should be invalidated');
            strict_1.default.ok(result.invalidatedClaims.includes('claim_c_001'), 'claim for C should be invalidated');
            // Chunks for B and C should be invalidated
            strict_1.default.ok(result.invalidatedChunks.includes('chunk_b_001'), 'chunk for B should be invalidated');
            strict_1.default.ok(result.invalidatedChunks.includes('chunk_c_001'), 'chunk for C should be invalidated');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('propagation with no dependencies only invalidates the changed file symbols', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const graph = new dependency_graph_js_1.DependencyGraph();
            const telemetry = new telemetry_js_1.Telemetry(false);
            const symX = makeSymbol('xxxxxxxxxxxxxxxx', 'funcX', '/repo/x.ts');
            db.insertSymbol(symX);
            const engine = new InvalidationEngine_js_1.InvalidationEngine(db, graph, telemetry);
            const result = engine.propagate({
                filePath: '/repo/x.ts',
                symbolIds: [],
                timestamp: Date.now(),
                reason: 'test',
            });
            strict_1.default.ok(result.invalidatedSymbols.includes(symX.id), 'X should be in impacted');
            strict_1.default.ok(result.invalidatedFiles.includes('/repo/x.ts'), 'file should be in invalidated files');
        }
        finally {
            cleanup();
        }
    });
});
//# sourceMappingURL=invalidation.test.js.map