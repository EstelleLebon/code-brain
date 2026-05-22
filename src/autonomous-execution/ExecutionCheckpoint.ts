export interface RollbackPoint {
  stepId: string;
  snapshotAt: Date;
  stateSnapshot: Record<string, unknown>;
}

export interface ExecutionState {
  planId: string;
  completedSteps: string[];
  failedSteps: string[];
  rolledBackSteps: string[];
  currentStepId?: string;
}

export interface Checkpoint {
  id: string;
  state: ExecutionState;
  rollbackPoints: RollbackPoint[];
  createdAt: Date;
}

function makeCheckpointId(): string {
  return `ckpt-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function cloneState(state: ExecutionState): ExecutionState {
  return {
    planId: state.planId,
    completedSteps: [...state.completedSteps],
    failedSteps: [...state.failedSteps],
    rolledBackSteps: [...state.rolledBackSteps],
    currentStepId: state.currentStepId,
  };
}

export class CheckpointManager {
  private checkpoints = new Map<string, Checkpoint>();

  save(state: ExecutionState, rollbackPoints: RollbackPoint[]): Checkpoint {
    const checkpoint: Checkpoint = {
      id: makeCheckpointId(),
      state: cloneState(state),
      rollbackPoints: rollbackPoints.map(rp => ({ ...rp })),
      createdAt: new Date(),
    };
    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  restore(checkpointId: string): Checkpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  rewind(checkpointId: string, toStepId: string): ExecutionState {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) throw new Error(`Checkpoint not found: ${checkpointId}`);

    const state = cloneState(checkpoint.state);
    // Remove steps after toStepId from completedSteps
    const toIdx = state.completedSteps.indexOf(toStepId);
    if (toIdx >= 0) {
      const removed = state.completedSteps.splice(toIdx + 1);
      state.rolledBackSteps.push(...removed);
    }
    state.currentStepId = toStepId;
    return state;
  }

  replay(checkpoint: Checkpoint): ExecutionState {
    return cloneState(checkpoint.state);
  }

  list(): Checkpoint[] {
    return Array.from(this.checkpoints.values());
  }
}
