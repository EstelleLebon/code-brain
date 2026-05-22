import type Database from 'better-sqlite3';
import type { FailurePattern } from '../../failure-memory/FailurePattern.js';
/** Persistent store for FailurePattern — survives restarts. */
export declare class FailureMemoryStore {
    private readonly db;
    constructor(db: Database.Database);
    save(pattern: FailurePattern): void;
    loadAll(): FailurePattern[];
    loadByOperationType(operationType: string): FailurePattern[];
    delete(id: string): void;
    private deserialize;
}
//# sourceMappingURL=FailureMemoryStore.d.ts.map