import { RuntimeSignal, RuntimeSignalType, RuntimeSignalStatus } from './RuntimeSignal.js';
export interface SignalCollectorConfig {
    source: string;
    timeoutMs?: number;
}
export interface CollectedSignal {
    signal: RuntimeSignal;
    raw?: string;
}
export declare class RuntimeSignalCollector {
    private readonly source;
    constructor(config: SignalCollectorConfig);
    collect(signalType: RuntimeSignalType, status: RuntimeSignalStatus, metadata?: Record<string, unknown>, durationMs?: number): RuntimeSignal;
    fromExitCode(signalType: RuntimeSignalType, exitCode: number, metadata?: Record<string, unknown>, durationMs?: number): RuntimeSignal;
    fromOutput(signalType: RuntimeSignalType, stdout: string, stderr: string, exitCode: number, durationMs?: number): RuntimeSignal;
}
//# sourceMappingURL=RuntimeSignalCollector.d.ts.map