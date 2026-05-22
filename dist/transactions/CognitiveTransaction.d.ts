import { Database } from 'better-sqlite3';
export type TransactionStatus = 'pending' | 'committed' | 'rolled_back';
export interface TransactionOperation {
    type: string;
    artifactIds: string[];
    data?: unknown;
}
export declare class CognitiveTransaction {
    private db;
    readonly id: string;
    readonly startedAt: number;
    private operations;
    private status;
    private savepoints;
    constructor(db: Database);
    begin(): void;
    savepoint(name: string): void;
    releaseSavepoint(name: string): void;
    rollbackToSavepoint(name: string): void;
    recordOperation(op: TransactionOperation): void;
    commit(): void;
    rollback(): void;
    getStatus(): TransactionStatus;
    getOperations(): TransactionOperation[];
    getDurationMs(): number;
}
//# sourceMappingURL=CognitiveTransaction.d.ts.map