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
export declare class CheckpointManager {
    private checkpoints;
    save(state: ExecutionState, rollbackPoints: RollbackPoint[]): Checkpoint;
    restore(checkpointId: string): Checkpoint | undefined;
    rewind(checkpointId: string, toStepId: string): ExecutionState;
    replay(checkpoint: Checkpoint): ExecutionState;
    list(): Checkpoint[];
}
//# sourceMappingURL=ExecutionCheckpoint.d.ts.map