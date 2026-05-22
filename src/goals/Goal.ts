export type GoalType = 'repair' | 'refactor' | 'optimize' | 'stabilize' | 'migrate' | 'cleanup' | 'test';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';
export type GoalStatus = 'pending' | 'decomposing' | 'planning' | 'executing' | 'paused' | 'completed' | 'failed' | 'aborted';

export interface GoalConstraint {
  maxRisk?: number;
  maxFilesChanged?: number;
  forbiddenPaths?: string[];
  requiredTests?: string[];
  runtimeBudgetMs?: number;
  mutationBudget?: number;
}

export interface AcceptanceCriterion {
  description: string;
  validate: (context: Record<string, unknown>) => boolean;
}

export interface Goal {
  id: string;
  description: string;
  type: GoalType;
  priority: GoalPriority;
  constraints: GoalConstraint;
  acceptanceCriteria: AcceptanceCriterion[];
  createdAt: Date;
  status: GoalStatus;
  parentGoalId?: string;
  subGoals?: Goal[];
  metadata?: Record<string, unknown>;
}

export interface GoalResult {
  goalId: string;
  status: GoalStatus;
  completedAt: Date;
  stepsExecuted: number;
  stepsRolledBack: number;
  finalRisk: number;
  outcome: 'success' | 'partial' | 'failure';
  notes: string[];
}
