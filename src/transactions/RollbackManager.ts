import { CognitiveTransaction } from './CognitiveTransaction.js';

export interface RollbackRecord {
  transactionId: string;
  reason: string;
  operationsAttempted: number;
  timestamp: number;
}

export class RollbackManager {
  private history: RollbackRecord[] = [];

  record(txn: CognitiveTransaction, reason: string): void {
    this.history.push({
      transactionId: txn.id,
      reason,
      operationsAttempted: txn.getOperations().length,
      timestamp: Date.now(),
    });
    txn.rollback();
  }

  getHistory(): RollbackRecord[] { return [...this.history]; }
  getCount(): number { return this.history.length; }
}
