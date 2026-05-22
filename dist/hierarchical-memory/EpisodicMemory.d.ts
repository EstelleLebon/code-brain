export type EpisodeType = 'transformation' | 'failure' | 'recovery' | 'session';
export interface Episode {
    id: string;
    type: EpisodeType;
    title: string;
    summary: string;
    tags: string[];
    timestamp: number;
    metadata: Record<string, unknown>;
}
/**
 * Records significant events: critical transformations, failures, recoveries, sessions.
 * Stored in-memory with optional size cap; notable episodes persist via SQLite if wired.
 */
export declare class EpisodicMemory {
    private episodes;
    private readonly maxSize;
    constructor(maxSize?: number);
    record(type: EpisodeType, title: string, summary: string, tags?: string[], metadata?: Record<string, unknown>): Episode;
    search(type?: EpisodeType, tag?: string): Episode[];
    recent(limit?: number): Episode[];
    all(): Episode[];
    size(): number;
}
//# sourceMappingURL=EpisodicMemory.d.ts.map