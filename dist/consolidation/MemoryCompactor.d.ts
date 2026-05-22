import type Database from 'better-sqlite3';
export interface CompactionResult {
    staleChunksRemoved: number;
    stalePatternsRemoved: number;
    replayEventsArchived: number;
    vacuumRan: boolean;
}
/**
 * Compacts SQLite storage by removing old stale artifacts and archiving replay events.
 * WAL-safe: uses DELETE + VACUUM (in WAL mode VACUUM creates a new WAL file).
 */
export declare class MemoryCompactor {
    private readonly db;
    constructor(db: Database.Database);
    compact(options?: {
        /** Remove chunks invalidated before this timestamp */
        staleBeforeMs?: number;
        /** Remove failure patterns not seen since this timestamp */
        patternExpireMs?: number;
        /** Remove replay events older than this timestamp */
        replayExpireMs?: number;
        /** Run VACUUM after compaction */
        vacuum?: boolean;
    }): CompactionResult;
}
//# sourceMappingURL=MemoryCompactor.d.ts.map