import type Database from 'better-sqlite3';
import type { SessionContext } from '../../session/SessionContext.js';
/** Persistent store for SessionContext — saves and restores sessions across restarts. */
export declare class SessionStore {
    private readonly db;
    constructor(db: Database.Database);
    save(session: SessionContext): void;
    load(sessionId: string): SessionContext | null;
    restoreSessions(): SessionContext[];
    delete(sessionId: string): void;
    private deserialize;
}
//# sourceMappingURL=SessionStore.d.ts.map