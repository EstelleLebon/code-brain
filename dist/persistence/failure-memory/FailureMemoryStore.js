"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureMemoryStore = void 0;
/** Persistent store for FailurePattern — survives restarts. */
class FailureMemoryStore {
    db;
    constructor(db) {
        this.db = db;
    }
    save(pattern) {
        this.db.prepare(`
      INSERT INTO failure_patterns (id, operation_type, structural_context, runtime_consequences, frequency, severity, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        frequency = excluded.frequency,
        severity = excluded.severity,
        last_seen = excluded.last_seen,
        structural_context = excluded.structural_context,
        runtime_consequences = excluded.runtime_consequences
    `).run(pattern.id, pattern.operationType, JSON.stringify(pattern.structuralContext), JSON.stringify(pattern.runtimeConsequences), pattern.frequency, pattern.severity, pattern.lastSeen);
    }
    loadAll() {
        const rows = this.db.prepare('SELECT * FROM failure_patterns ORDER BY last_seen DESC').all();
        return rows.map(r => this.deserialize(r));
    }
    loadByOperationType(operationType) {
        const rows = this.db.prepare('SELECT * FROM failure_patterns WHERE operation_type = ? ORDER BY last_seen DESC').all(operationType);
        return rows.map(r => this.deserialize(r));
    }
    delete(id) {
        this.db.prepare('DELETE FROM failure_patterns WHERE id = ?').run(id);
    }
    deserialize(r) {
        return {
            id: r.id,
            operationType: r.operation_type,
            structuralContext: JSON.parse(r.structural_context),
            runtimeConsequences: JSON.parse(r.runtime_consequences),
            frequency: r.frequency,
            severity: r.severity,
            lastSeen: r.last_seen,
        };
    }
}
exports.FailureMemoryStore = FailureMemoryStore;
//# sourceMappingURL=FailureMemoryStore.js.map