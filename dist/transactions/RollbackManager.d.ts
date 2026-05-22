import { CognitiveTransaction } from './CognitiveTransaction.js';
export interface RollbackRecord {
    transactionId: string;
    reason: string;
    operationsAttempted: number;
    timestamp: number;
}
export declare class RollbackManager {
    private history;
    record(txn: CognitiveTransaction, reason: string): void;
    getHistory(): RollbackRecord[];
    getCount(): number;
}
//# sourceMappingURL=RollbackManager.d.ts.map