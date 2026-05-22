"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticReplayStore = void 0;
/** Persistent append-only store for semantic transformation replay events. */
class SemanticReplayStore {
    db;
    constructor(db) {
        this.db = db;
    }
    append(record) {
        this.db.prepare(`
      INSERT OR IGNORE INTO semantic_replay_events (id, operation_id, transformation_type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(record.id, record.operationId, record.transformationType, JSON.stringify(record.payload), record.timestamp);
    }
    query(filter = {}) {
        let sql = 'SELECT * FROM semantic_replay_events WHERE 1=1';
        const params = [];
        if (filter.operationId) {
            sql += ' AND operation_id = ?';
            params.push(filter.operationId);
        }
        if (filter.transformationType) {
            sql += ' AND transformation_type = ?';
            params.push(filter.transformationType);
        }
        if (filter.since !== undefined) {
            sql += ' AND timestamp >= ?';
            params.push(filter.since);
        }
        sql += ' ORDER BY timestamp ASC';
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(r => ({
            id: r.id,
            operationId: r.operation_id,
            transformationType: r.transformation_type,
            payload: JSON.parse(r.payload),
            timestamp: r.timestamp,
        }));
    }
    byOperation(operationId) {
        return this.query({ operationId });
    }
    byTransformation(transformationType) {
        return this.query({ transformationType });
    }
    clear() {
        this.db.prepare('DELETE FROM semantic_replay_events').run();
    }
}
exports.SemanticReplayStore = SemanticReplayStore;
//# sourceMappingURL=SemanticReplayStore.js.map