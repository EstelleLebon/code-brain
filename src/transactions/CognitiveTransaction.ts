import { Database } from 'better-sqlite3';

export type TransactionStatus = 'pending' | 'committed' | 'rolled_back';

export interface TransactionOperation {
  type: string;
  artifactIds: string[];
  data?: unknown;
}

export class CognitiveTransaction {
  readonly id: string;
  readonly startedAt: number;
  private operations: TransactionOperation[] = [];
  private status: TransactionStatus = 'pending';
  private savepoints: string[] = [];

  constructor(private db: Database) {
    this.id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = Date.now();
  }

  begin(): void {
    this.db.exec('BEGIN');
  }

  savepoint(name: string): void {
    this.db.exec(`SAVEPOINT ${name}`);
    this.savepoints.push(name);
  }

  releaseSavepoint(name: string): void {
    this.db.exec(`RELEASE SAVEPOINT ${name}`);
    this.savepoints = this.savepoints.filter(s => s !== name);
  }

  rollbackToSavepoint(name: string): void {
    this.db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
  }

  recordOperation(op: TransactionOperation): void {
    this.operations.push(op);
  }

  commit(): void {
    this.db.exec('COMMIT');
    this.status = 'committed';
  }

  rollback(): void {
    try { this.db.exec('ROLLBACK'); } catch {}
    this.status = 'rolled_back';
  }

  getStatus(): TransactionStatus { return this.status; }
  getOperations(): TransactionOperation[] { return [...this.operations]; }
  getDurationMs(): number { return Date.now() - this.startedAt; }
}
