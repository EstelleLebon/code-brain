"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackManager = void 0;
class RollbackManager {
    history = [];
    record(txn, reason) {
        this.history.push({
            transactionId: txn.id,
            reason,
            operationsAttempted: txn.getOperations().length,
            timestamp: Date.now(),
        });
        txn.rollback();
    }
    getHistory() { return [...this.history]; }
    getCount() { return this.history.length; }
}
exports.RollbackManager = RollbackManager;
//# sourceMappingURL=RollbackManager.js.map