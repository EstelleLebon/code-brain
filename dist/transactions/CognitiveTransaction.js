"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveTransaction = void 0;
class CognitiveTransaction {
    db;
    id;
    startedAt;
    operations = [];
    status = 'pending';
    savepoints = [];
    constructor(db) {
        this.db = db;
        this.id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.startedAt = Date.now();
    }
    begin() {
        this.db.exec('BEGIN');
    }
    savepoint(name) {
        this.db.exec(`SAVEPOINT ${name}`);
        this.savepoints.push(name);
    }
    releaseSavepoint(name) {
        this.db.exec(`RELEASE SAVEPOINT ${name}`);
        this.savepoints = this.savepoints.filter(s => s !== name);
    }
    rollbackToSavepoint(name) {
        this.db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
    }
    recordOperation(op) {
        this.operations.push(op);
    }
    commit() {
        this.db.exec('COMMIT');
        this.status = 'committed';
    }
    rollback() {
        try {
            this.db.exec('ROLLBACK');
        }
        catch { }
        this.status = 'rolled_back';
    }
    getStatus() { return this.status; }
    getOperations() { return [...this.operations]; }
    getDurationMs() { return Date.now() - this.startedAt; }
}
exports.CognitiveTransaction = CognitiveTransaction;
//# sourceMappingURL=CognitiveTransaction.js.map