import { EventEmitter } from 'node:events';
import { ExecutionPlan } from '../planning/PlanGenerator.js';
import { AdaptivePlanner } from '../planning/AdaptivePlanner.js';
import { CheckpointManager } from './ExecutionCheckpoint.js';
import { GoalResult } from '../goals/Goal.js';
export type ExecutorEvent = {
    type: string;
    stepId?: string;
    planId: string;
    data?: unknown;
    timestamp: Date;
};
export declare class AutonomousExecutor extends EventEmitter {
    private planner;
    private checkpoints;
    private _paused;
    private _aborted;
    private _resumeResolve;
    constructor(planner: AdaptivePlanner, checkpoints: CheckpointManager);
    execute(plan: ExecutionPlan, options?: {
        dryRun?: boolean;
    }): Promise<GoalResult[]>;
    pause(): void;
    resume(): void;
    abort(): void;
    private _emit;
    private _waitIfPaused;
}
//# sourceMappingURL=AutonomousExecutor.d.ts.map