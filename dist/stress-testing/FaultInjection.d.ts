export type FaultType = 'runtime_timeout' | 'memory_pressure' | 'random_failure' | 'corrupted_retrieval' | 'trust_drift' | 'event_loss' | 'partial_rollback' | 'stale_snapshot';
export interface FaultScenario {
    id: string;
    faultType: FaultType;
    probability: number;
    executionId?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
}
export interface InjectedFault {
    id: string;
    scenario: FaultScenario;
    injectedAt: Date;
    clearedAt?: Date;
    triggerCount: number;
}
export interface FaultInjectionResult {
    triggered: boolean;
    fault?: InjectedFault;
    reason?: string;
}
export declare class FaultInjector {
    private _faults;
    private _seed;
    private _rngState;
    constructor(seed?: number);
    private _rand;
    inject(scenario: FaultScenario): InjectedFault;
    clear(faultId: string): boolean;
    clearAll(): void;
    activeFaults(executionId?: string): InjectedFault[];
    /**
     * Check whether a given fault type should trigger for this execution.
     * Respects probability and executionId scoping.
     */
    shouldTrigger(faultType: FaultType, executionId?: string): FaultInjectionResult;
    resetSeed(seed: number): void;
}
//# sourceMappingURL=FaultInjection.d.ts.map