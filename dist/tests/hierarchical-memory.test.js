"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const WorkingMemory_js_1 = require("../hierarchical-memory/WorkingMemory.js");
const EpisodicMemory_js_1 = require("../hierarchical-memory/EpisodicMemory.js");
const SemanticMemory_js_1 = require("../hierarchical-memory/SemanticMemory.js");
const ProceduralMemory_js_1 = require("../hierarchical-memory/ProceduralMemory.js");
const CognitiveMode_js_1 = require("../cognitive-modes/CognitiveMode.js");
function makeSignal() {
    return { id: 's1', signalType: 'test', status: 'success', source: 'jest', timestamp: Date.now() };
}
function makeOutcome() {
    return { id: 'o1', operationId: 'op1', outcome: 'success', signals: [], riskObserved: 10, summary: [], timestamp: Date.now() };
}
(0, node_test_1.describe)('WorkingMemory', () => {
    (0, node_test_1.test)('stores active chunks', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('session-1');
        wm.setActiveChunks(['chunk-a', 'chunk-b']);
        const snap = wm.snapshot();
        strict_1.default.deepEqual(snap.activeChunkIds, ['chunk-a', 'chunk-b']);
    });
    (0, node_test_1.test)('buffers signals up to maxSignals', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('s', 99999, 3);
        wm.addSignal(makeSignal());
        wm.addSignal(makeSignal());
        wm.addSignal(makeSignal());
        wm.addSignal(makeSignal()); // triggers shift
        strict_1.default.equal(wm.snapshot().recentSignals.length, 3);
    });
    (0, node_test_1.test)('buffers outcomes up to maxOutcomes', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('s', 99999, 50, 2);
        wm.addOutcome(makeOutcome());
        wm.addOutcome(makeOutcome());
        wm.addOutcome(makeOutcome()); // triggers shift
        strict_1.default.equal(wm.snapshot().recentOutcomes.length, 2);
    });
    (0, node_test_1.test)('clear resets state', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('s');
        wm.addSignal(makeSignal());
        wm.setActiveChunks(['chunk-a']);
        wm.clear();
        const snap = wm.snapshot();
        strict_1.default.equal(snap.recentSignals.length, 0);
        strict_1.default.equal(snap.activeChunkIds.length, 0);
    });
    (0, node_test_1.test)('isExpired returns false for fresh memory', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('s', 60_000);
        strict_1.default.equal(wm.isExpired(), false);
    });
    (0, node_test_1.test)('isExpired returns true for ttl=0', () => {
        const wm = new WorkingMemory_js_1.WorkingMemory('s', 0);
        strict_1.default.equal(wm.isExpired(), true);
    });
});
(0, node_test_1.describe)('EpisodicMemory', () => {
    (0, node_test_1.test)('records episodes', () => {
        const mem = new EpisodicMemory_js_1.EpisodicMemory();
        mem.record('transformation', 'Rename foo', 'Renamed symbol foo → bar', ['rename']);
        strict_1.default.equal(mem.size(), 1);
    });
    (0, node_test_1.test)('search by type', () => {
        const mem = new EpisodicMemory_js_1.EpisodicMemory();
        mem.record('failure', 'Build failed', 'TypeScript error', ['build']);
        mem.record('transformation', 'Good rename', 'ok', []);
        strict_1.default.equal(mem.search('failure').length, 1);
        strict_1.default.equal(mem.search('transformation').length, 1);
    });
    (0, node_test_1.test)('search by tag', () => {
        const mem = new EpisodicMemory_js_1.EpisodicMemory();
        mem.record('recovery', 'Rollback', 'Rolled back 3 files', ['rollback', 'critical']);
        mem.record('session', 'Session start', 'ok', ['session']);
        strict_1.default.equal(mem.search(undefined, 'rollback').length, 1);
        strict_1.default.equal(mem.search(undefined, 'critical').length, 1);
    });
    (0, node_test_1.test)('recent returns newest first', () => {
        const mem = new EpisodicMemory_js_1.EpisodicMemory();
        mem.record('session', 'A', 'a', []);
        mem.record('session', 'B', 'b', []);
        const recent = mem.recent(2);
        strict_1.default.equal(recent[0].title, 'B');
    });
    (0, node_test_1.test)('evicts oldest when over maxSize', () => {
        const mem = new EpisodicMemory_js_1.EpisodicMemory(3);
        mem.record('session', 'A', 'a', []);
        mem.record('session', 'B', 'b', []);
        mem.record('session', 'C', 'c', []);
        mem.record('session', 'D', 'd', []); // evicts A
        strict_1.default.equal(mem.size(), 3);
        strict_1.default.ok(!mem.all().find(e => e.title === 'A'));
    });
});
(0, node_test_1.describe)('SemanticMemory', () => {
    (0, node_test_1.test)('upsert creates new fact', () => {
        const mem = new SemanticMemory_js_1.SemanticMemory();
        const fact = mem.upsert('dependency-injection', 'Constructor injection pattern', 0.8, 'src-1');
        strict_1.default.equal(fact.concept, 'dependency-injection');
        strict_1.default.equal(fact.confidence, 0.8);
    });
    (0, node_test_1.test)('upsert merges confidence on duplicate', () => {
        const mem = new SemanticMemory_js_1.SemanticMemory();
        mem.upsert('di', 'pattern', 0.6, 'src-1');
        const updated = mem.upsert('di', 'pattern', 0.8, 'src-2');
        // confidence = (0.6 + 0.8) / 2 = 0.7
        strict_1.default.ok(Math.abs(updated.confidence - 0.7) < 0.01);
        strict_1.default.ok(updated.sources.includes('src-2'));
    });
    (0, node_test_1.test)('search finds by keyword', () => {
        const mem = new SemanticMemory_js_1.SemanticMemory();
        mem.upsert('singleton', 'One instance pattern', 0.9, 'src-1');
        mem.upsert('factory', 'Creation pattern', 0.7, 'src-2');
        strict_1.default.equal(mem.search('singleton').length, 1);
        strict_1.default.equal(mem.search('pattern').length, 2);
    });
    (0, node_test_1.test)('topByConfidence returns sorted results', () => {
        const mem = new SemanticMemory_js_1.SemanticMemory();
        mem.upsert('a', 'low', 0.3, 'x');
        mem.upsert('b', 'high', 0.9, 'x');
        mem.upsert('c', 'mid', 0.6, 'x');
        const top = mem.topByConfidence(2);
        strict_1.default.equal(top[0].concept, 'b');
        strict_1.default.equal(top[1].concept, 'c');
    });
});
(0, node_test_1.describe)('ProceduralMemory', () => {
    (0, node_test_1.test)('records new pattern', () => {
        const mem = new ProceduralMemory_js_1.ProceduralMemory();
        const p = mem.record('rename-flow', CognitiveMode_js_1.CognitiveMode.SAFE_REFACTOR, ['rename_symbol'], true, 200);
        strict_1.default.equal(p.successRate, 1);
        strict_1.default.equal(p.executionCount, 1);
    });
    (0, node_test_1.test)('updates existing pattern success rate', () => {
        const mem = new ProceduralMemory_js_1.ProceduralMemory();
        mem.record('flow', CognitiveMode_js_1.CognitiveMode.HOTFIX, ['rename_symbol'], true, 100);
        mem.record('flow', CognitiveMode_js_1.CognitiveMode.HOTFIX, ['rename_symbol'], false, 150);
        const p = mem.find('flow', CognitiveMode_js_1.CognitiveMode.HOTFIX);
        strict_1.default.equal(p.executionCount, 2);
        strict_1.default.ok(Math.abs(p.successRate - 0.5) < 0.01);
    });
    (0, node_test_1.test)('bestForMode returns only patterns with 2+ executions sorted by rate', () => {
        const mem = new ProceduralMemory_js_1.ProceduralMemory();
        mem.record('a', CognitiveMode_js_1.CognitiveMode.RECOVERY, ['op1'], true, 100);
        mem.record('a', CognitiveMode_js_1.CognitiveMode.RECOVERY, ['op1'], true, 100);
        mem.record('b', CognitiveMode_js_1.CognitiveMode.RECOVERY, ['op2'], true, 100); // only 1 exec
        const best = mem.bestForMode(CognitiveMode_js_1.CognitiveMode.RECOVERY);
        strict_1.default.equal(best.length, 1);
        strict_1.default.equal(best[0].name, 'a');
    });
});
//# sourceMappingURL=hierarchical-memory.test.js.map