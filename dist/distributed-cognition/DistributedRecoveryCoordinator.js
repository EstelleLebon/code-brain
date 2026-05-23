"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedRecoveryCoordinator = void 0;
class DistributedRecoveryCoordinator {
    plans;
    logicalClock;
    planCounter;
    constructor() {
        this.plans = [];
        this.logicalClock = 0;
        this.planCounter = 0;
    }
    nextPlanId() {
        this.planCounter++;
        return `plan-${this.planCounter}`;
    }
    makePlan(reason, actions) {
        this.logicalClock++;
        const plan = {
            planId: this.nextPlanId(),
            triggeredAt: this.logicalClock,
            reason,
            actions,
            estimatedSteps: actions.length,
            completed: false,
        };
        this.plans.push(plan);
        return plan;
    }
    triggerGlobalRollback(reason) {
        return this.makePlan(reason, [{ type: 'global_rollback', reason }]);
    }
    triggerTargetedRollback(nodeId, reason) {
        return this.makePlan(reason, [{ type: 'targeted_rollback', nodeId, reason }]);
    }
    triggerSyncReplay(executionId) {
        return this.makePlan(`sync_replay for ${executionId}`, [{ type: 'sync_replay', executionId }]);
    }
    triggerMemoryReconciliation(nodeIds) {
        return this.makePlan(`memory_reconciliation for ${nodeIds.join(',')}`, [
            { type: 'memory_reconciliation', nodeIds: [...nodeIds] },
        ]);
    }
    triggerLeaderReelection(currentLeaderId) {
        return this.makePlan(`leader_reelection replacing ${currentLeaderId}`, [
            { type: 'leader_reelection', currentLeaderId },
        ]);
    }
    completePlan(planId) {
        this.logicalClock++;
        const plan = this.plans.find(p => p.planId === planId);
        if (plan && !plan.completed) {
            plan.completed = true;
            plan.completedAt = this.logicalClock;
        }
    }
    getActivePlans() {
        return this.plans.filter(p => !p.completed);
    }
    getCompletedPlans() {
        return this.plans.filter(p => p.completed);
    }
    getAllPlans() {
        return [...this.plans];
    }
    reset() {
        this.plans = [];
        this.logicalClock = 0;
        this.planCounter = 0;
    }
}
exports.DistributedRecoveryCoordinator = DistributedRecoveryCoordinator;
//# sourceMappingURL=DistributedRecoveryCoordinator.js.map