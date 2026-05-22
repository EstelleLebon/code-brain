import type Database from 'better-sqlite3';
import type { RuntimeReplayEvent } from '../../runtime-replay/RuntimeReplayEvent.js';
/** Persistent append-only store for RuntimeReplayEvents. */
export declare class RuntimeReplayStore {
    private readonly db;
    constructor(db: Database.Database);
    append(event: RuntimeReplayEvent): void;
    query(filter?: {
        operationId?: string;
        causedRollback?: boolean;
        since?: number;
    }): RuntimeReplayEvent[];
    byOperation(operationId: string): RuntimeReplayEvent[];
    rollbacks(): RuntimeReplayEvent[];
    clear(): void;
}
//# sourceMappingURL=RuntimeReplayStore.d.ts.map