import { RuntimeSignal, RuntimeSignalType, RuntimeSignalStatus } from './RuntimeSignal.js';
export interface AggregatedSignals {
    byType: Partial<Record<RuntimeSignalType, RuntimeSignal[]>>;
    overallStatus: RuntimeSignalStatus;
    hasFailures: boolean;
    hasWarnings: boolean;
    totalCount: number;
}
export declare class RuntimeSignalAggregator {
    private signals;
    add(signal: RuntimeSignal): void;
    addMany(signals: RuntimeSignal[]): void;
    aggregate(): AggregatedSignals;
    forType(type: RuntimeSignalType): RuntimeSignal[];
    since(timestamp: number): RuntimeSignal[];
    clear(): void;
    all(): RuntimeSignal[];
}
//# sourceMappingURL=RuntimeSignalAggregator.d.ts.map