import { CognitiveReplayEvent, ReplayEventType } from './types.js';
export declare class ReplayLog {
    private events;
    record(eventType: ReplayEventType, artifactIds: string[], transactionId: string, metadata?: Record<string, unknown>): CognitiveReplayEvent;
    getEvents(): CognitiveReplayEvent[];
    getEventsByType(type: ReplayEventType): CognitiveReplayEvent[];
    getEventsByTransaction(transactionId: string): CognitiveReplayEvent[];
    since(timestamp: number): CognitiveReplayEvent[];
    clear(): void;
}
//# sourceMappingURL=ReplayLog.d.ts.map