import { createHash } from 'crypto';

export interface SessionEntry {
  symbolId: string;
  filePath: string;
  accessCount: number;
  lastAccessedAt: number;
}

export interface SessionContext {
  id: string;
  startedAt: number;
  entries: Map<string, SessionEntry>;  // symbolId → entry
  focusFiles: Set<string>;
}

function makeSessionId(): string {
  return createHash('sha256')
    .update(String(Date.now()) + Math.random().toString(36))
    .digest('hex')
    .slice(0, 16);
}

export class SessionManager {
  private sessions: Map<string, SessionContext> = new Map();

  createSession(): string {
    const id = makeSessionId();
    const session: SessionContext = {
      id,
      startedAt: Date.now(),
      entries: new Map(),
      focusFiles: new Set(),
    };
    this.sessions.set(id, session);
    return id;
  }

  getSession(id: string): SessionContext | undefined {
    return this.sessions.get(id);
  }

  recordAccess(sessionId: string, symbolId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const existing = session.entries.get(symbolId);
    if (existing) {
      existing.accessCount++;
      existing.lastAccessedAt = Date.now();
    } else {
      session.entries.set(symbolId, {
        symbolId,
        filePath,
        accessCount: 1,
        lastAccessedAt: Date.now(),
      });
    }
    session.focusFiles.add(filePath);
  }

  getFocusedSymbols(sessionId: string, limit = 20): SessionEntry[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.entries.values())
      .sort((a, b) => b.accessCount - a.accessCount || b.lastAccessedAt - a.lastAccessedAt)
      .slice(0, limit);
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
