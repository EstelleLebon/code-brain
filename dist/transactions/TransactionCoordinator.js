"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionCoordinator = void 0;
const CognitiveTransaction_js_1 = require("./CognitiveTransaction.js");
const RollbackManager_js_1 = require("./RollbackManager.js");
class TransactionCoordinator {
    db;
    rollbackManager;
    constructor(db) {
        this.db = db;
        this.rollbackManager = new RollbackManager_js_1.RollbackManager();
    }
    async execute(fn) {
        const txn = new CognitiveTransaction_js_1.CognitiveTransaction(this.db);
        txn.begin();
        try {
            const data = await fn(txn);
            txn.commit();
            return { success: true, data, transactionId: txn.id, durationMs: txn.getDurationMs(), rolledBack: false };
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            this.rollbackManager.record(txn, reason);
            return { success: false, error: reason, transactionId: txn.id, durationMs: txn.getDurationMs(), rolledBack: true };
        }
    }
    getRollbackManager() { return this.rollbackManager; }
}
exports.TransactionCoordinator = TransactionCoordinator;
//# sourceMappingURL=TransactionCoordinator.js.map