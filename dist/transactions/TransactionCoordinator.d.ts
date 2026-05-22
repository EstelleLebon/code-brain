import { Database } from 'better-sqlite3';
import { CognitiveTransaction } from './CognitiveTransaction.js';
import { RollbackManager } from './RollbackManager.js';
export interface TransactionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    transactionId: string;
    durationMs: number;
    rolledBack: boolean;
}
export declare class TransactionCoordinator {
    private db;
    private rollbackManager;
    constructor(db: Database);
    execute<T>(fn: (txn: CognitiveTransaction) => Promise<T>): Promise<TransactionResult<T>>;
    getRollbackManager(): RollbackManager;
}
//# sourceMappingURL=TransactionCoordinator.d.ts.map