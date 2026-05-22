"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = void 0;
/** Persistent store for SessionContext — saves and restores sessions across restarts. */
class SessionStore {
    db;
    constructor(db) {
        this.db = db;
    }
    save(session) {
        const entries = {};
        for (const [k, v] of session.entries) {
            entries[k] = { ...v };
        }
        const payload = JSON.stringify({
            entries,
            focusFiles: [...session.focusFiles],
        });
        this.db.prepare(`
      INSERT INTO sessions (session_id, created_at, last_access, payload)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET last_access = excluded.last_access, payload = excluded.payload
    `).run(session.id, session.startedAt, Date.now(), payload);
    }
    load(sessionId) {
        const row = this.db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId);
        if (!row)
            return null;
        return this.deserialize(row);
    }
    restoreSessions() {
        const rows = this.db.prepare('SELECT * FROM sessions ORDER BY last_access DESC').all();
        return rows.map(r => this.deserialize(r));
    }
    delete(sessionId) {
        this.db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
    }
    deserialize(row) {
        const p = JSON.parse(row.payload);
        const entries = new Map();
        for (const [k, v] of Object.entries(p.entries ?? {})) {
            entries.set(k, v);
        }
        return {
            id: row.session_id,
            startedAt: row.created_at,
            entries,
            focusFiles: new Set(p.focusFiles ?? []),
        };
    }
}
exports.SessionStore = SessionStore;
//# sourceMappingURL=SessionStore.js.map