"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckpointManager = void 0;
function makeCheckpointId() {
    return `ckpt-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}
function cloneState(state) {
    return {
        planId: state.planId,
        completedSteps: [...state.completedSteps],
        failedSteps: [...state.failedSteps],
        rolledBackSteps: [...state.rolledBackSteps],
        currentStepId: state.currentStepId,
    };
}
class CheckpointManager {
    checkpoints = new Map();
    save(state, rollbackPoints) {
        const checkpoint = {
            id: makeCheckpointId(),
            state: cloneState(state),
            rollbackPoints: rollbackPoints.map(rp => ({ ...rp })),
            createdAt: new Date(),
        };
        this.checkpoints.set(checkpoint.id, checkpoint);
        return checkpoint;
    }
    restore(checkpointId) {
        return this.checkpoints.get(checkpointId);
    }
    rewind(checkpointId, toStepId) {
        const checkpoint = this.checkpoints.get(checkpointId);
        if (!checkpoint)
            throw new Error(`Checkpoint not found: ${checkpointId}`);
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
    replay(checkpoint) {
        return cloneState(checkpoint.state);
    }
    list() {
        return Array.from(this.checkpoints.values());
    }
}
exports.CheckpointManager = CheckpointManager;
//# sourceMappingURL=ExecutionCheckpoint.js.map