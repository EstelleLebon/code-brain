import { ClusterTrustManager } from './ClusterTrustManager.js';
import { ConsensusHealthMonitor } from './ConsensusHealthMonitor.js';
import { DistributedRecoveryCoordinator, RecoveryPlan } from './DistributedRecoveryCoordinator.js';
export interface DistributedLoopObservation {
    nodeId: string;
    executionId: string;
    outcome: 'success' | 'failure' | 'timeout' | 'partition';
    consensusMode?: string;
    trustDelta?: number;
    timestamp: number;
}
export interface DistributedLoopState {
    iteration: number;
    globalTrust: number;
    overallConsensusHealth: number;
    activeRecoveryPlans: number;
    aggression: number;
    rebalancePending: boolean;
}
export declare class DistributedCognitiveLoop {
    private clusterTrust;
    private healthMonitor;
    private recoveryCoordinator;
    private logicalClock;
    private iteration;
    private aggression;
    private stableIterations;
    private rebalancePending;
    constructor(clusterTrust: ClusterTrustManager, healthMonitor: ConsensusHealthMonitor, recoveryCoordinator: DistributedRecoveryCoordinator);
    observe(obs: DistributedLoopObservation): void;
    adapt(): void;
    rebalance(nodeIds: string[]): string[];
    triggerRecoveryIfNeeded(): RecoveryPlan | null;
    isolateUnstableNodes(): string[];
    getState(): DistributedLoopState;
    reset(): void;
}
//# sourceMappingURL=DistributedCognitiveLoop.d.ts.map