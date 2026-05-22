import type Database from 'better-sqlite3';
import type { SessionContext } from '../../session/SessionContext.js';

interface SessionRow {
  session_id: string;
  created_at: number;
  last_access: number;
  payload: string;
}

/** Persistent store for SessionContext — saves and restores sessions across restarts. */
export class SessionStore {
  constructor(private readonly db: Database.Database) {}

  save(session: SessionContext): void {
    const entries: Record<string, unknown> = {};
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

  load(sessionId: string): SessionContext | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as SessionRow | undefined;
    if (!row) return null;
    return this.deserialize(row);
  }

  restoreSessions(): SessionContext[] {
    const rows = this.db.prepare('SELECT * FROM sessions ORDER BY last_access DESC').all() as SessionRow[];
    return rows.map(r => this.deserialize(r));
  }

  delete(sessionId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
  }

  private deserialize(row: SessionRow): SessionContext {
    const p = JSON.parse(row.payload);
    const entries = new Map<string, any>();
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
