import { RuntimeReplayEvent } from './RuntimeReplayEvent.js';
export interface RuntimeReplayQuery {
    operationId?: string;
    causedRollback?: boolean;
    since?: number;
    outcomeId?: string;
}
export declare class RuntimeReplayLog {
    private events;
    record(operationId: string, runtimeSignals: string[], outcomeId: string, causedRollback: boolean, metadata?: Record<string, unknown>): RuntimeReplayEvent;
    query(q?: RuntimeReplayQuery): RuntimeReplayEvent[];
    forOperation(operationId: string): RuntimeReplayEvent[];
    rollbacks(): RuntimeReplayEvent[];
    all(): RuntimeReplayEvent[];
    clear(): void;
}
//# sourceMappingURL=RuntimeReplayLog.d.ts.map