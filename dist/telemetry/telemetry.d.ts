export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export interface MetricEntry {
    name: string;
    value: number;
    tags?: Record<string, string>;
    timestamp: number;
}
export declare class Telemetry {
    private enabled;
    private metrics;
    constructor(enabled?: boolean);
    log(level: LogLevel, event: string, data?: Record<string, unknown>): void;
    time<T>(label: string, fn: () => T): T;
    metric(name: string, value: number, tags?: Record<string, string>): void;
    getMetrics(): MetricEntry[];
    clearMetrics(): void;
}
export declare const globalTelemetry: Telemetry;
//# sourceMappingURL=telemetry.d.ts.map