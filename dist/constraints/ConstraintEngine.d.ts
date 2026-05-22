import { ExecutionPlan } from '../planning/PlanGenerator.js';
import { GoalConstraint } from '../goals/Goal.js';
export interface ConstraintViolation {
    constraint: string;
    severity: 'error' | 'warning';
    message: string;
}
export declare class ConstraintEngine {
    evaluate(plan: ExecutionPlan, constraints: GoalConstraint): ConstraintViolation[];
    isValid(plan: ExecutionPlan, constraints: GoalConstraint): boolean;
}
//# sourceMappingURL=ConstraintEngine.d.ts.map