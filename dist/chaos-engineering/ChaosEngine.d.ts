import { FaultInjector } from '../stress-testing/FaultInjection.js';
import { ChaosPolicy, ChaosPolicyLevel } from './ChaosPolicy.js';
import { NetworkScenarioResult } from './ChaosNetworkScenario.js';
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
    private _activeScenarios;
    private _scenarioCounter;
    constructor(injector?: FaultInjector, policyLevel?: ChaosPolicyLevel);
    start(tickIntervalMs?: number): void;
    stop(): void;
    tick(health: CognitiveHealth): ChaosTickResult;
    applyPolicy(level: ChaosPolicyLevel): void;
    status(): ChaosEngineStatus;
    policy(): ChaosPolicy;
    tickHistory(): ChaosTickResult[];
    injector(): FaultInjector;
    get activeScenarios(): Map<string, NetworkScenarioResult>;
    private _lcg;
    private _makeScenarioId;
    injectPartition(nodeIds: string[], seed?: number): NetworkScenarioResult;
    healPartition(partitionId: string): void;
    isolateLeader(leaderId: string, seed?: number): NetworkScenarioResult;
    degradeConsensus(intensity: number, seed?: number): NetworkScenarioResult;
    randomizeDeliveryOrder(seed: number): void;
    injectSplitBrain(groupA: string[], groupB: string[], seed?: number): NetworkScenarioResult;
    private _shouldAbort;
}
//# sourceMappingURL=ChaosEngine.d.ts.map