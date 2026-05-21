export interface SessionEntry {
    symbolId: string;
    filePath: string;
    accessCount: number;
    lastAccessedAt: number;
}
export interface SessionContext {
    id: string;
    startedAt: number;
    entries: Map<string, SessionEntry>;
    focusFiles: Set<string>;
}
export declare class SessionManager {
    private sessions;
    createSession(): string;
    getSession(id: string): SessionContext | undefined;
    recordAccess(sessionId: string, symbolId: string, filePath: string): void;
    getFocusedSymbols(sessionId: string, limit?: number): SessionEntry[];
    clearSession(sessionId: string): void;
}
//# sourceMappingURL=SessionContext.d.ts.map