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
const embedder_js_1 = require("../embeddings/embedder.js");
const dependency_graph_js_1 = require("../graph/dependency-graph.js");
const retrieval_js_1 = require("../retrieval/retrieval.js");
const telemetry_js_1 = require("../telemetry/telemetry.js");
const chunker_js_1 = require("../chunks/chunker.js");
function makeTempDb() {
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'code-brain-test-'));
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
function makeSymbol(overrides = {}) {
    const now = Date.now();
    return {
        id: overrides.id ?? 'sym_' + Math.random().toString(36).slice(2, 10),
        name: overrides.name ?? 'testSymbol',
        kind: overrides.kind ?? 'function',
        filePath: overrides.filePath ?? '/test/file.ts',
        startLine: overrides.startLine ?? 1,
        endLine: overrides.endLine ?? 10,
        signature: overrides.signature ?? 'function testSymbol(): void',
        exported: overrides.exported ?? true,
        dependencies: overrides.dependencies ?? [],
        hash: overrides.hash ?? 'abc123def456abc1',
        createdAt: now,
        updatedAt: now,
    };
}
(0, node_test_1.describe)('Retrieval', () => {
    (0, node_test_1.test)('getSymbol returns exact match', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const sym = makeSymbol({ name: 'authenticate', kind: 'function' });
            db.insertSymbol(sym);
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const found = retrieval.getSymbol('authenticate');
            strict_1.default.ok(found, 'Should find the symbol');
            strict_1.default.equal(found?.name, 'authenticate');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('getSymbolById returns correct symbol', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const sym = makeSymbol({ id: 'test_id_123456789', name: 'myFunc' });
            db.insertSymbol(sym);
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const found = retrieval.getSymbolById('test_id_123456789');
            strict_1.default.ok(found, 'Should find by id');
            strict_1.default.equal(found?.name, 'myFunc');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('findRelevant returns symbols for matching query', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            // Insert symbols with content
            const sym1 = makeSymbol({ name: 'validateUser', kind: 'function', signature: 'function validateUser(token: string): boolean' });
            const sym2 = makeSymbol({ id: 'sym2_id_12345678', name: 'parseConfig', kind: 'function', signature: 'function parseConfig(path: string): object' });
            db.insertSymbol(sym1);
            db.insertSymbol(sym2);
            // Insert chunks and embeddings
            const chunk1 = (0, chunker_js_1.chunkSymbol)(sym1, sym1.signature);
            const chunk2 = (0, chunker_js_1.chunkSymbol)(sym2, sym2.signature);
            db.insertChunk(chunk1);
            db.insertChunk(chunk2);
            embedder.computeAndStore(chunk1.id, (chunk1.content + ' ' + chunk1.summary).trim());
            embedder.computeAndStore(chunk2.id, (chunk2.content + ' ' + chunk2.summary).trim());
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const results = retrieval.findRelevant('validate token user', 5);
            strict_1.default.ok(results.length > 0, 'Should return at least one result');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('getDependencies traverses graph', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const symA = makeSymbol({ id: 'aaaaaaaaaaaaaaaa', name: 'funcA' });
            const symB = makeSymbol({ id: 'bbbbbbbbbbbbbbbb', name: 'funcB' });
            db.insertSymbol(symA);
            db.insertSymbol(symB);
            graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });
            const deps = retrieval.getDependencies(symA.id, 1);
            strict_1.default.ok(deps.some(s => s.id === symB.id), 'funcA should depend on funcB');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('getDependents traverses reverse graph', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const symA = makeSymbol({ id: 'aaaaaaaaaaaaaaaa', name: 'funcA' });
            const symB = makeSymbol({ id: 'bbbbbbbbbbbbbbbb', name: 'funcB' });
            db.insertSymbol(symA);
            db.insertSymbol(symB);
            graph.addEdge({ fromId: symA.id, toId: symB.id, kind: 'import' });
            const dependents = retrieval.getDependents(symB.id, 1);
            strict_1.default.ok(dependents.some(s => s.id === symA.id), 'funcB should have funcA as dependent');
        }
        finally {
            cleanup();
        }
    });
    (0, node_test_1.test)('queryContext expands to include dependencies', () => {
        const { db, cleanup } = makeTempDb();
        try {
            const telemetry = new telemetry_js_1.Telemetry(false);
            const graph = new dependency_graph_js_1.DependencyGraph();
            const embedder = new embedder_js_1.Embedder(db, telemetry, 64);
            const sym1 = makeSymbol({ name: 'authMiddleware', kind: 'function', signature: 'function authMiddleware(req: Request): void' });
            const sym2 = makeSymbol({ id: 'dep_id_123456789', name: 'verifyToken', kind: 'function', signature: 'function verifyToken(t: string): boolean' });
            db.insertSymbol(sym1);
            db.insertSymbol(sym2);
            const chunk1 = (0, chunker_js_1.chunkSymbol)(sym1, sym1.signature);
            const chunk2 = (0, chunker_js_1.chunkSymbol)(sym2, sym2.signature);
            db.insertChunk(chunk1);
            db.insertChunk(chunk2);
            embedder.computeAndStore(chunk1.id, chunk1.content + ' ' + chunk1.summary);
            embedder.computeAndStore(chunk2.id, chunk2.content + ' ' + chunk2.summary);
            graph.addEdge({ fromId: sym1.id, toId: sym2.id, kind: 'call' });
            const retrieval = new retrieval_js_1.Retrieval(db, embedder, graph, telemetry);
            const ctx = retrieval.queryContext('authentication middleware token');
            strict_1.default.ok(ctx.symbols.length > 0, 'Should return symbols');
            strict_1.default.ok(ctx.chunks.length > 0, 'Should return chunks');
        }
        finally {
            cleanup();
        }
    });
});
//# sourceMappingURL=retrieval.test.js.map