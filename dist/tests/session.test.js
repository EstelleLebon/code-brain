"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const SessionContext_js_1 = require("../session/SessionContext.js");
const SessionBias_js_1 = require("../session/SessionBias.js");
const index_js_1 = require("../types/index.js");
function makeResult(symbolId, filePath, score) {
    return {
        chunk: {
            id: `chunk_${symbolId}`,
            symbolId,
            content: `content for ${symbolId}`,
            hash: `hash_${symbolId}`,
            truthLevel: index_js_1.TruthLevel.STRUCTURAL,
        },
        score,
        trace: {
            source: filePath,
            retrievalReason: 'semantic_similarity',
            confidence: score,
            truthLevel: index_js_1.TruthLevel.STRUCTURAL,
        },
    };
}
(0, node_test_1.describe)('SessionManager', () => {
    (0, node_test_1.test)('createSession returns a unique id', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const id1 = manager.createSession();
        const id2 = manager.createSession();
        strict_1.default.ok(id1.length > 0, 'Session ID should not be empty');
        strict_1.default.notEqual(id1, id2, 'Session IDs should be unique');
    });
    (0, node_test_1.test)('recordAccess increments access count', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_001', '/repo/a.ts');
        manager.recordAccess(sessionId, 'sym_001', '/repo/a.ts');
        manager.recordAccess(sessionId, 'sym_002', '/repo/b.ts');
        const focused = manager.getFocusedSymbols(sessionId);
        const sym001 = focused.find(e => e.symbolId === 'sym_001');
        const sym002 = focused.find(e => e.symbolId === 'sym_002');
        strict_1.default.ok(sym001, 'sym_001 should be in focused symbols');
        strict_1.default.equal(sym001?.accessCount, 2, 'sym_001 access count should be 2');
        strict_1.default.ok(sym002, 'sym_002 should be in focused symbols');
        strict_1.default.equal(sym002?.accessCount, 1, 'sym_002 access count should be 1');
    });
    (0, node_test_1.test)('getFocusedSymbols returns sorted by accessCount desc', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
        manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');
        manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');
        manager.recordAccess(sessionId, 'sym_b', '/repo/b.ts');
        const focused = manager.getFocusedSymbols(sessionId);
        strict_1.default.equal(focused[0].symbolId, 'sym_b', 'Most accessed symbol should be first');
    });
    (0, node_test_1.test)('getFocusedSymbols respects limit', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        for (let i = 0; i < 10; i++) {
            manager.recordAccess(sessionId, `sym_${i}`, `/repo/file_${i}.ts`);
        }
        const focused = manager.getFocusedSymbols(sessionId, 3);
        strict_1.default.equal(focused.length, 3, 'Should respect limit');
    });
    (0, node_test_1.test)('clearSession removes the session', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_x', '/repo/x.ts');
        manager.clearSession(sessionId);
        const session = manager.getSession(sessionId);
        strict_1.default.equal(session, undefined, 'Session should be cleared');
    });
});
(0, node_test_1.describe)('applySessionBias', () => {
    (0, node_test_1.test)('boosts results matching session entries', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_hot', '/repo/hot.ts');
        const session = manager.getSession(sessionId);
        const results = [
            makeResult('sym_hot', '/repo/hot.ts', 0.5),
            makeResult('sym_cold', '/repo/cold.ts', 0.8),
        ];
        const biased = (0, SessionBias_js_1.applySessionBias)(results, session, 0.2);
        // sym_hot gets boosted: 0.5 + 0.2 = 0.7, sym_cold stays at 0.8
        // So order should be: sym_cold (0.8), sym_hot (0.7)
        strict_1.default.equal(biased[0].chunk.symbolId, 'sym_cold', 'sym_cold should still be first (0.8 > 0.7)');
        strict_1.default.equal(biased[1].chunk.symbolId, 'sym_hot', 'sym_hot should be second after boost');
        strict_1.default.ok(biased[1].score > 0.5, 'sym_hot score should be boosted');
    });
    (0, node_test_1.test)('sets retrievalReason to session_bias for boosted items', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_focus', '/repo/focus.ts');
        const session = manager.getSession(sessionId);
        const results = [
            makeResult('sym_focus', '/repo/focus.ts', 0.5),
            makeResult('sym_other', '/repo/other.ts', 0.4),
        ];
        const biased = (0, SessionBias_js_1.applySessionBias)(results, session);
        const focusResult = biased.find(r => r.chunk.symbolId === 'sym_focus');
        strict_1.default.equal(focusResult?.trace.retrievalReason, 'session_bias', 'Boosted item should have session_bias reason');
    });
    (0, node_test_1.test)('re-sorts by score desc after boost', () => {
        const manager = new SessionContext_js_1.SessionManager();
        const sessionId = manager.createSession();
        manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
        manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
        manager.recordAccess(sessionId, 'sym_a', '/repo/a.ts');
        const session = manager.getSession(sessionId);
        const results = [
            makeResult('sym_b', '/repo/b.ts', 0.9),
            makeResult('sym_a', '/repo/a.ts', 0.3),
        ];
        const biased = (0, SessionBias_js_1.applySessionBias)(results, session, 0.5);
        // sym_a: 0.3 + 0.5 = 0.8, sym_b: 0.9 — sym_b still first
        strict_1.default.equal(biased[0].chunk.symbolId, 'sym_b');
        strict_1.default.equal(biased[1].chunk.symbolId, 'sym_a');
    });
});
//# sourceMappingURL=session.test.js.map