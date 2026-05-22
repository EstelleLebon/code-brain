"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCompactor = void 0;
/**
 * Compacts SQLite storage by removing old stale artifacts and archiving replay events.
 * WAL-safe: uses DELETE + VACUUM (in WAL mode VACUUM creates a new WAL file).
 */
class MemoryCompactor {
    db;
    constructor(db) {
        this.db = db;
    }
    compact(options = {}) {
        const { staleBeforeMs = Date.now() - 30 * 24 * 60 * 60 * 1000, patternExpireMs = Date.now() - 90 * 24 * 60 * 60 * 1000, replayExpireMs = Date.now() - 14 * 24 * 60 * 60 * 1000, vacuum = true, } = options;
        const staleInfo = this.db.prepare('DELETE FROM chunks WHERE invalidated_at IS NOT NULL AND invalidated_at < ?').run(staleBeforeMs);
        const patternInfo = this.db.prepare('DELETE FROM failure_patterns WHERE last_seen < ?').run(patternExpireMs);
        const replayInfo = this.db.prepare('DELETE FROM replay_events WHERE timestamp < ?').run(replayExpireMs);
        const runtimeReplayInfo = this.db.prepare('DELETE FROM runtime_replay_events WHERE timestamp < ?').run(replayExpireMs);
        const semanticReplayInfo = this.db.prepare('DELETE FROM semantic_replay_events WHERE timestamp < ?').run(replayExpireMs);
        if (vacuum) {
            this.db.prepare('VACUUM').run();
        }
        return {
            staleChunksRemoved: staleInfo.changes,
            stalePatternsRemoved: patternInfo.changes,
            replayEventsArchived: replayInfo.changes + runtimeReplayInfo.changes + semanticReplayInfo.changes,
            vacuumRan: vacuum,
        };
    }
}
exports.MemoryCompactor = MemoryCompactor;
//# sourceMappingURL=MemoryCompactor.js.map