"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayLogStore = void 0;
/** Persistent append-only store for CognitiveReplayEvents (v1.6 replay log). */
class ReplayLogStore {
    db;
    constructor(db) {
        this.db = db;
    }
    append(event) {
        this.db.prepare(`
      INSERT OR IGNORE INTO replay_events (id, operation_id, event_type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(event.id, event.transactionId, event.eventType, JSON.stringify({ artifactIds: event.artifactIds, metadata: event.metadata }), event.timestamp);
    }
    query(filter = {}) {
        let sql = 'SELECT * FROM replay_events WHERE 1=1';
        const params = [];
        if (filter.operationId) {
            sql += ' AND operation_id = ?';
            params.push(filter.operationId);
        }
        if (filter.eventType) {
            sql += ' AND event_type = ?';
            params.push(filter.eventType);
        }
        if (filter.since !== undefined) {
            sql += ' AND timestamp >= ?';
            params.push(filter.since);
        }
        sql += ' ORDER BY timestamp ASC';
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(r => {
            const p = JSON.parse(r.payload);
            return {
                id: r.id,
                timestamp: r.timestamp,
                eventType: r.event_type,
                artifactIds: p.artifactIds ?? [],
                transactionId: r.operation_id,
                metadata: p.metadata,
            };
        });
    }
    byOperation(operationId) {
        return this.query({ operationId });
    }
    clear() {
        this.db.prepare('DELETE FROM replay_events').run();
    }
}
exports.ReplayLogStore = ReplayLogStore;
//# sourceMappingURL=ReplayLogStore.js.map