import { ExecutionPlan } from './PlanGenerator.js';
export declare class AdaptivePlanner {
    replan(plan: ExecutionPlan, failedStepId: string, _feedback: unknown): ExecutionPlan;
    reduceScope(plan: ExecutionPlan, maxRisk: number): ExecutionPlan;
    splitStep(plan: ExecutionPlan, stepId: string): ExecutionPlan;
    injectRecoveryStep(plan: ExecutionPlan, afterStepId: string): ExecutionPlan;
    abortPlan(plan: ExecutionPlan): ExecutionPlan;
}
//# sourceMappingURL=AdaptivePlanner.d.ts.map