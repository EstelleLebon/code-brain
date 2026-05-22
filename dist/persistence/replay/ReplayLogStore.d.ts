import type Database from 'better-sqlite3';
import type { CognitiveReplayEvent, ReplayEventType } from '../../replay/types.js';
/** Persistent append-only store for CognitiveReplayEvents (v1.6 replay log). */
export declare class ReplayLogStore {
    private readonly db;
    constructor(db: Database.Database);
    append(event: CognitiveReplayEvent): void;
    query(filter?: {
        operationId?: string;
        eventType?: ReplayEventType;
        since?: number;
    }): CognitiveReplayEvent[];
    byOperation(operationId: string): CognitiveReplayEvent[];
    clear(): void;
}
//# sourceMappingURL=ReplayLogStore.d.ts.map