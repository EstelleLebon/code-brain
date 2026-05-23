"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterminismValidator = void 0;
const ExecutionFingerprint_js_1 = require("./ExecutionFingerprint.js");
function combineResults(...results) {
    if (results.some(r => r === 'fail'))
        return 'fail';
    if (results.some(r => r === 'warn'))
        return 'warn';
    return 'pass';
}
class DeterminismValidator {
    _fingerprints = new Map();
    registerFingerprint(fp) {
        const existing = this._fingerprints.get(fp.executionId) ?? [];
        existing.push(fp);
        this._fingerprints.set(fp.executionId, existing);
    }
    validateReplay(executionId) {
        const fps = this._fingerprints.get(executionId) ?? [];
        if (fps.length < 2) {
            return {
                executionId,
                result: 'warn',
                similarity: 1,
                diff: { matching: [], diverging: [], identical: true, similarityScore: 1 },
                notes: ['fewer than 2 replay fingerprints registered'],
            };
        }
        const base = fps[0];
        const replays = fps.slice(1);
        const diffs = replays.map(r => (0, ExecutionFingerprint_js_1.compareFingerprints)(base, r));
        const minSimilarity = Math.min(...diffs.map(d => d.similarityScore));
        const allIdentical = diffs.every(d => d.identical);
        const notes = [];
        let result = 'pass';
        if (!allIdentical) {
            if (minSimilarity < 0.7) {
                result = 'fail';
                notes.push(`low replay similarity: ${minSimilarity.toFixed(2)}`);
            }
            else {
                result = 'warn';
                notes.push(`minor replay divergence: ${minSimilarity.toFixed(2)}`);
            }
        }
        return { executionId, result, similarity: minSimilarity, diff: diffs[0], notes };
    }
    validateSnapshots(executionId) {
        const fps = this._fingerprints.get(executionId) ?? [];
        if (fps.length === 0)
            return 'warn';
        // All fingerprints with same executionId should have same hash if deterministic
        const hashes = new Set(fps.map(f => f.hash));
        if (hashes.size === 1)
            return 'pass';
        if (hashes.size <= Math.ceil(fps.length / 2))
            return 'warn';
        return 'fail';
    }
    validateDeterminism(executionId) {
        const replayResult = this.validateReplay(executionId);
        const snapshotDeterminism = this.validateSnapshots(executionId);
        const planDeterminism = replayResult.result; // proxy: if replay is consistent, plan is too
        const eventOrderStability = replayResult.similarity >= 0.9 ? 'pass' : 'warn';
        const overall = combineResults(replayResult.result, snapshotDeterminism, planDeterminism, eventOrderStability);
        return {
            executionId,
            replayConsistency: replayResult.result,
            snapshotDeterminism,
            planDeterminism,
            eventOrderStability,
            overall,
            notes: replayResult.notes,
        };
    }
    reset(executionId) {
        if (executionId) {
            this._fingerprints.delete(executionId);
        }
        else {
            this._fingerprints.clear();
        }
    }
    // Distributed-specific validation helpers
    validateDistributedEventOrdering(events) {
        for (let i = 1; i < events.length; i++) {
            const a = events[i - 1];
            const b = events[i];
            if (b.logicalClock < a.logicalClock)
                return false;
            if (b.logicalClock === a.logicalClock && b.timestamp < a.timestamp)
                return false;
            if (b.logicalClock === a.logicalClock &&
                b.timestamp === a.timestamp &&
                b.nodeId < a.nodeId)
                return false;
        }
        return true;
    }
    validateConsensusDeterminism(runA, runB) {
        if (runA.length !== runB.length)
            return false;
        for (let i = 0; i < runA.length; i++) {
            if (runA[i].round !== runB[i].round || runA[i].outcome !== runB[i].outcome)
                return false;
        }
        return true;
    }
    validatePartitionReplayStability(runA, runB) {
        if (runA.length !== runB.length)
            return false;
        for (let i = 0; i < runA.length; i++) {
            if (runA[i].eventType !== runB[i].eventType)
                return false;
        }
        return true;
    }
    validateMemoryReplicationConvergence(entries) {
        const byKey = new Map();
        for (const e of entries) {
            const g = byKey.get(e.key) ?? [];
            g.push(e);
            byKey.set(e.key, g);
        }
        for (const group of byKey.values()) {
            const values = new Set(group.map(e => JSON.stringify(e.value)));
            if (values.size > 1) {
                // Check if they converge via max version
                const maxVersion = Math.max(...group.map(e => e.version));
                const atMax = group.filter(e => e.version === maxVersion);
                const maxValues = new Set(atMax.map(e => JSON.stringify(e.value)));
                if (maxValues.size > 1)
                    return false;
            }
        }
        return true;
    }
}
exports.DeterminismValidator = DeterminismValidator;
//# sourceMappingURL=DeterminismValidator.js.map