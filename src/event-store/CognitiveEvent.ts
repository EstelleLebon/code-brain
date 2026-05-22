export type CognitiveEventType =
  | 'goal:created'
  | 'plan:generated'
  | 'step:executed'
  | 'runtime:validated'
  | 'learning:observed'
  | 'recovery:triggered'
  | 'rollback:applied'
  | 'constraint:violated'
  | 'mode:switched';

interface BaseEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly executionId: string;
  readonly eventType: CognitiveEventType;
  readonly causationId?: string;
  readonly correlationId?: string;
}

export interface GoalCreatedEvent extends BaseEvent {
  readonly eventType: 'goal:created';
  readonly payload: {
    goalId: string;
    goalType: string;
    priority: string;
    description: string;
  };
}

export interface PlanGeneratedEvent extends BaseEvent {
  readonly eventType: 'plan:generated';
  readonly payload: {
    planId: string;
    goalId: string;
    stepCount: number;
    estimatedRisk: number;
  };
}

export interface StepExecutedEvent extends BaseEvent {
  readonly eventType: 'step:executed';
  readonly payload: {
    stepId: string;
    planId: string;
    outcome: 'success' | 'failure' | 'skipped';
    durationMs: number;
    error?: string;
  };
}

export interface RuntimeValidatedEvent extends BaseEvent {
  readonly eventType: 'runtime:validated';
  readonly payload: {
    targetId: string;
    passed: boolean;
    violations: string[];
  };
}

export interface LearningObservedEvent extends BaseEvent {
  readonly eventType: 'learning:observed';
  readonly payload: {
    outcome: 'success' | 'failure' | 'partial';
    affectedChunkIds: string[];
    signalStrength: number;
  };
}

export interface RecoveryTriggeredEvent extends BaseEvent {
  readonly eventType: 'recovery:triggered';
  readonly payload: {
    strategyId: string;
    reason: string;
    targetStepId?: string;
  };
}

export interface RollbackAppliedEvent extends BaseEvent {
  readonly eventType: 'rollback:applied';
  readonly payload: {
    planId: string;
    rolledBackSteps: string[];
    depth: number;
  };
}

export interface ConstraintViolationEvent extends BaseEvent {
  readonly eventType: 'constraint:violated';
  readonly payload: {
    constraintType: string;
    violatedBy: string;
    threshold: number;
    actual: number;
  };
}

export interface ModeSwitchedEvent extends BaseEvent {
  readonly eventType: 'mode:switched';
  readonly payload: {
    fromMode: string;
    toMode: string;
    reason: string;
  };
}

export type CognitiveEvent =
  | GoalCreatedEvent
  | PlanGeneratedEvent
  | StepExecutedEvent
  | RuntimeValidatedEvent
  | LearningObservedEvent
  | RecoveryTriggeredEvent
  | RollbackAppliedEvent
  | ConstraintViolationEvent
  | ModeSwitchedEvent;

let _seq = 0;

export function makeEventId(): string {
  return `evt-${Date.now()}-${++_seq}`;
}

export function createEvent<T extends CognitiveEvent>(
  partial: Omit<T, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }
): T {
  return {
    id: partial.id ?? makeEventId(),
    timestamp: partial.timestamp ?? new Date(),
    ...partial,
  } as T;
}
