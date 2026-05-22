import { SemanticReplayEvent } from './types.js';
export interface SemanticReplayFilter {
    operationType?: string;
    transformationId?: string;
    status?: SemanticReplayEvent['status'];
    since?: number;
}
export declare class SemanticReplayLog {
    private events;
    record(event: Omit<SemanticReplayEvent, 'id' | 'timestamp'>): SemanticReplayEvent;
    query(filter?: SemanticReplayFilter): SemanticReplayEvent[];
    getByTransformation(transformationId: string): SemanticReplayEvent[];
    canReplay(transformationId: string): boolean;
    clear(): void;
    get size(): number;
}
//# sourceMappingURL=SemanticReplayLog.d.ts.map