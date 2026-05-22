import type Database from 'better-sqlite3';
export interface SemanticReplayRecord {
    id: string;
    operationId: string;
    transformationType: string;
    payload: Record<string, unknown>;
    timestamp: number;
}
/** Persistent append-only store for semantic transformation replay events. */
export declare class SemanticReplayStore {
    private readonly db;
    constructor(db: Database.Database);
    append(record: SemanticReplayRecord): void;
    query(filter?: {
        operationId?: string;
        transformationType?: string;
        since?: number;
    }): SemanticReplayRecord[];
    byOperation(operationId: string): SemanticReplayRecord[];
    byTransformation(transformationType: string): SemanticReplayRecord[];
    clear(): void;
}
//# sourceMappingURL=SemanticReplayStore.d.ts.map