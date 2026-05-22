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

export class TransactionCoordinator {
  private rollbackManager: RollbackManager;

  constructor(private db: Database) {
    this.rollbackManager = new RollbackManager();
  }

  async execute<T>(
    fn: (txn: CognitiveTransaction) => Promise<T>
  ): Promise<TransactionResult<T>> {
    const txn = new CognitiveTransaction(this.db);
    txn.begin();
    try {
      const data = await fn(txn);
      txn.commit();
      return { success: true, data, transactionId: txn.id, durationMs: txn.getDurationMs(), rolledBack: false };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.rollbackManager.record(txn, reason);
      return { success: false, error: reason, transactionId: txn.id, durationMs: txn.getDurationMs(), rolledBack: true };
    }
  }

  getRollbackManager(): RollbackManager { return this.rollbackManager; }
}
