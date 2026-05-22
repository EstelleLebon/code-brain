"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotManager = void 0;
let _snapSeq = 0;
class SnapshotManager {
    _snapshots = new Map();
    createSnapshot(executionId, source, metadata = {}) {
        const snap = Object.freeze({
            id: `snap-${Date.now()}-${++_snapSeq}`,
            createdAt: new Date(),
            executionId,
            memory: {
                workingMemory: source.getWorkingMemoryState(),
                episodicMemory: source.getEpisodicMemoryState(),
                semanticMemory: source.getSemanticMemoryState(),
                proceduralMemory: source.getProceduralMemoryState(),
            },
            trust: source.getTrustState(),
            metadata,
        });
        this._snapshots.set(snap.id, snap);
        return snap;
    }
    restoreSnapshot(id) {
        return this._snapshots.get(id);
    }
    latest() {
        let latest;
        for (const snap of this._snapshots.values()) {
            if (!latest || snap.createdAt >= latest.createdAt)
                latest = snap;
        }
        return latest;
    }
    latestForExecution(executionId) {
        let latest;
        for (const snap of this._snapshots.values()) {
            if (snap.executionId !== executionId)
                continue;
            if (!latest || snap.createdAt >= latest.createdAt)
                latest = snap;
        }
        return latest;
    }
    list() {
        return [...this._snapshots.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    clear() {
        this._snapshots.clear();
    }
}
exports.SnapshotManager = SnapshotManager;
//# sourceMappingURL=SnapshotManager.js.map