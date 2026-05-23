export type RecoveryAction = {
    type: 'global_rollback';
    reason: string;
} | {
    type: 'targeted_rollback';
    nodeId: string;
    reason: string;
} | {
    type: 'sync_replay';
    executionId: string;
} | {
    type: 'memory_reconciliation';
    nodeIds: string[];
} | {
    type: 'leader_reelection';
    currentLeaderId: string;
};
export interface RecoveryPlan {
    planId: string;
    triggeredAt: number;
    reason: string;
    actions: RecoveryAction[];
    estimatedSteps: number;
    completed: boolean;
    completedAt?: number;
}
export declare class DistributedRecoveryCoordinator {
    private plans;
    private logicalClock;
    private planCounter;
    constructor();
    private nextPlanId;
    private makePlan;
    triggerGlobalRollback(reason: string): RecoveryPlan;
    triggerTargetedRollback(nodeId: string, reason: string): RecoveryPlan;
    triggerSyncReplay(executionId: string): RecoveryPlan;
    triggerMemoryReconciliation(nodeIds: string[]): RecoveryPlan;
    triggerLeaderReelection(currentLeaderId: string): RecoveryPlan;
    completePlan(planId: string): void;
    getActivePlans(): RecoveryPlan[];
    getCompletedPlans(): RecoveryPlan[];
    getAllPlans(): RecoveryPlan[];
    reset(): void;
}
//# sourceMappingURL=DistributedRecoveryCoordinator.d.ts.map