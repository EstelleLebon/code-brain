import { ExecutionPlan } from '../planning/PlanGenerator.js';
import { GoalConstraint } from '../goals/Goal.js';

export interface ConstraintViolation {
  constraint: string;
  severity: 'error' | 'warning';
  message: string;
}

export class ConstraintEngine {
  evaluate(plan: ExecutionPlan, constraints: GoalConstraint): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Check maxRisk
    if (constraints.maxRisk !== undefined && plan.estimatedTotalRisk > constraints.maxRisk) {
      violations.push({
        constraint: 'maxRisk',
        severity: 'error',
        message: `Estimated total risk ${plan.estimatedTotalRisk} exceeds maxRisk ${constraints.maxRisk}`,
      });
    }

    // Check maxFilesChanged
    if (constraints.maxFilesChanged !== undefined && plan.steps.length > constraints.maxFilesChanged) {
      violations.push({
        constraint: 'maxFilesChanged',
        severity: 'warning',
        message: `Plan has ${plan.steps.length} steps which may exceed maxFilesChanged ${constraints.maxFilesChanged}`,
      });
    }

    // Check forbidden paths
    if (constraints.forbiddenPaths && constraints.forbiddenPaths.length > 0) {
      for (const step of plan.steps) {
        for (const forbidden of constraints.forbiddenPaths) {
          if (step.label.includes(forbidden)) {
            violations.push({
              constraint: 'forbiddenPaths',
              severity: 'error',
              message: `Step "${step.label}" references forbidden path: ${forbidden}`,
            });
          }
        }
      }
    }

    // Check mutationBudget
    if (constraints.mutationBudget !== undefined && plan.steps.length > constraints.mutationBudget) {
      violations.push({
        constraint: 'mutationBudget',
        severity: 'error',
        message: `Plan requires ${plan.steps.length} mutations which exceeds budget ${constraints.mutationBudget}`,
      });
    }

    // Check runtimeBudgetMs
    if (constraints.runtimeBudgetMs !== undefined) {
      const estimatedMs = plan.steps.length * 100; // assume 100ms/step
      if (estimatedMs > constraints.runtimeBudgetMs) {
        violations.push({
          constraint: 'runtimeBudgetMs',
          severity: 'warning',
          message: `Estimated runtime ${estimatedMs}ms may exceed budget ${constraints.runtimeBudgetMs}ms`,
        });
      }
    }

    return violations;
  }

  isValid(plan: ExecutionPlan, constraints: GoalConstraint): boolean {
    const violations = this.evaluate(plan, constraints);
    return violations.every(v => v.severity !== 'error');
  }
}
