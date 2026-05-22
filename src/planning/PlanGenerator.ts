import { Goal } from '../goals/Goal.js';
import { ExecutionGraph, ExecutionNode } from './ExecutionGraph.js';

export interface ExecutionStep {
  id: string;
  goalId: string;
  label: string;
  estimatedRisk: number;
  dependencies: string[]; // step ids
  cognitiveMode: string;
  rollbackStrategy: 'none' | 'revert' | 'compensate' | 'abort';
}

export interface ExecutionPlan {
  id: string;
  goals: Goal[];
  steps: ExecutionStep[];
  graph: ExecutionGraph;
  createdAt: Date;
  estimatedTotalRisk: number;
}

function makePlanId(): string {
  return `plan-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function goalTypeToMode(type: Goal['type']): string {
  const map: Record<Goal['type'], string> = {
    repair: 'surgical',
    refactor: 'exploratory',
    optimize: 'analytical',
    stabilize: 'conservative',
    migrate: 'incremental',
    cleanup: 'batch',
    test: 'validation',
  };
  return map[type] ?? 'default';
}

function rollbackStrategy(risk: number): ExecutionStep['rollbackStrategy'] {
  if (risk >= 80) return 'abort';
  if (risk >= 50) return 'compensate';
  if (risk >= 20) return 'revert';
  return 'none';
}

export class PlanGenerator {
  generate(goals: Goal[]): ExecutionPlan {
    const steps: ExecutionStep[] = [];
    const graph = new ExecutionGraph();
    const goalIdToStepId = new Map<string, string>();

    // Flatten goals (include subGoals recursively)
    const allGoals = this._flattenGoals(goals);

    for (const goal of allGoals) {
      const stepId = `step-${goal.id}`;
      const risk = goal.constraints.maxRisk ?? 30;
      goalIdToStepId.set(goal.id, stepId);

      const step: ExecutionStep = {
        id: stepId,
        goalId: goal.id,
        label: goal.description,
        estimatedRisk: risk,
        dependencies: [],
        cognitiveMode: goalTypeToMode(goal.type),
        rollbackStrategy: rollbackStrategy(risk),
      };
      steps.push(step);

      const node: ExecutionNode = {
        id: stepId,
        goalId: goal.id,
        label: goal.description,
        estimatedRisk: risk,
        cognitiveMode: step.cognitiveMode,
      };
      graph.addNode(node);
    }

    // Wire dependency edges based on parentGoalId and metadata.dependsOnGoalIds
    for (const goal of allGoals) {
      const stepId = goalIdToStepId.get(goal.id)!;
      const depIds: string[] = (goal.metadata?.dependsOnGoalIds as string[] | undefined) ?? [];

      for (const depGoalId of depIds) {
        const depStepId = goalIdToStepId.get(depGoalId);
        if (depStepId) {
          const step = steps.find(s => s.id === stepId)!;
          step.dependencies.push(depStepId);
          graph.addEdge({ from: stepId, to: depStepId, type: 'depends_on' });
        }
      }
    }

    const totalRisk = steps.reduce((sum, s) => sum + s.estimatedRisk, 0);

    return {
      id: makePlanId(),
      goals,
      steps,
      graph,
      createdAt: new Date(),
      estimatedTotalRisk: totalRisk,
    };
  }

  private _flattenGoals(goals: Goal[]): Goal[] {
    const result: Goal[] = [];
    for (const g of goals) {
      result.push(g);
      if (g.subGoals && g.subGoals.length > 0) {
        result.push(...this._flattenGoals(g.subGoals));
      }
    }
    return result;
  }
}
