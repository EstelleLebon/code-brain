import { ClusterTrustManager } from './ClusterTrustManager.js';
import { ConsensusHealthMonitor } from './ConsensusHealthMonitor.js';
import { DistributedRecoveryCoordinator } from './DistributedRecoveryCoordinator.js';
import type { CognitiveExecutionRuntime, ClusterHealthSnapshot, CycleResult, DeterministicState } from './CognitiveExecutionRuntime.js';
import type { SplitBrainDetector } from '../distributed-reliability/SplitBrainDetector.js';
export interface DistributedExecutionRuntimeOptions {
    clusterTrust?: ClusterTrustManager;
    healthMonitor?: ConsensusHealthMonitor;
    recoveryCoordinator?: DistributedRecoveryCoordinator;
    splitBrainDetector?: SplitBrainDetector;
}
/**
 * Concrete implementation of CognitiveExecutionRuntime for distributed clusters.
 * Encapsulates DistributedCognitiveLoop, ClusterTrustManager, ConsensusHealthMonitor,
 * DistributedRecoveryCoordinator, and SplitBrainDetector.
 * No throws — all errors result in degraded outcomes.
 */
export declare class DistributedExecutionRuntime implements CognitiveExecutionRuntime {
    private readonly clusterTrust;
    private readonly healthMonitor;
    private readonly recoveryCoordinator;
    private readonly loop;
    private readonly splitBrainDetector?;
    private executionCounter;
    constructor(opts?: DistributedExecutionRuntimeOptions);
    executeCycle(nodeIds: string[]): CycleResult;
    recoverNode(nodeId: string, reason: string): boolean;
    synchronizeCluster(nodeIds: string[]): void;
    getClusterHealth(): ClusterHealthSnapshot;
    getDeterministicState(): DeterministicState;
    reset(): void;
    private resolveOutcome;
}
//# sourceMappingURL=DistributedExecutionRuntime.d.ts.map