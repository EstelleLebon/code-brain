export interface RuntimeReplayEvent {
    id: string;
    operationId: string;
    runtimeSignals: string[];
    outcomeId: string;
    causedRollback: boolean;
    timestamp: number;
    metadata?: Record<string, unknown>;
}
export declare function makeReplayEventId(): string;
//# sourceMappingURL=RuntimeReplayEvent.d.ts.map