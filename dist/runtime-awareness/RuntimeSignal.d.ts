export type RuntimeSignalType = 'test' | 'lint' | 'build' | 'typecheck' | 'benchmark' | 'runtime_error' | 'coverage';
export type RuntimeSignalStatus = 'success' | 'warning' | 'failure';
export interface RuntimeSignal {
    id: string;
    signalType: RuntimeSignalType;
    status: RuntimeSignalStatus;
    source: string;
    timestamp: number;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}
export interface RuntimeSnapshot {
    id: string;
    operationId?: string;
    capturedAt: number;
    signals: RuntimeSignal[];
    summary: {
        total: number;
        success: number;
        warning: number;
        failure: number;
    };
}
export declare function createSnapshot(operationId: string | undefined, signals: RuntimeSignal[]): RuntimeSnapshot;
//# sourceMappingURL=RuntimeSignal.d.ts.map