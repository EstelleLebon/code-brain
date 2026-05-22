import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
export interface RuntimeHealthReport {
    totalSignals: number;
    passRate: number;
    failRate: number;
    warningRate: number;
    byType: Map<string, {
        pass: number;
        fail: number;
        warn: number;
    }>;
    overallHealth: number;
}
export declare class RuntimeHealthMetrics {
    private signals;
    private readonly maxSignals;
    constructor(maxSignals?: number);
    ingest(signal: RuntimeSignal): void;
    ingestAll(signals: RuntimeSignal[]): void;
    report(): RuntimeHealthReport;
}
//# sourceMappingURL=RuntimeHealthMetrics.d.ts.map