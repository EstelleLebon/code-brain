import { FaultInjector } from '../stress-testing/FaultInjection.js';
import { ChaosPolicy, ChaosPolicyLevel } from './ChaosPolicy.js';
export type CognitiveHealth = {
    trustScore: number;
    rollbackDepth: number;
    replanRate: number;
};
export type ChaosEngineStatus = 'idle' | 'running' | 'stopped' | 'aborted';
export interface ChaosTickResult {
    faultsInjected: number;
    policyLevel: ChaosPolicyLevel;
    aborted: boolean;
    reason?: string;
}
export declare class ChaosEngine {
    private _injector;
    private _policy;
    private _status;
    private _tickCount;
    private _activeFaultIds;
    private _intervalHandle;
    private _tickHistory;
    constructor(injector?: FaultInjector, policyLevel?: ChaosPolicyLevel);
    start(tickIntervalMs?: number): void;
    stop(): void;
    tick(health: CognitiveHealth): ChaosTickResult;
    applyPolicy(level: ChaosPolicyLevel): void;
    status(): ChaosEngineStatus;
    policy(): ChaosPolicy;
    tickHistory(): ChaosTickResult[];
    injector(): FaultInjector;
    private _shouldAbort;
}
//# sourceMappingURL=ChaosEngine.d.ts.map