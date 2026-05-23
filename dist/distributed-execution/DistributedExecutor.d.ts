import type { Goal } from '../goals/Goal.js';
import type { NodeRegistry } from '../distributed/NodeRegistry.js';
import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import type { DistributedPlanner, DistributedExecutionPlan } from '../distributed-planning/DistributedPlanner.js';
import type { ConsensusEngine } from '../distributed-planning/ConsensusEngine.js';
import type { ExecutionPlan } from '../planning/PlanGenerator.js';
export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted' | 'recovering';
export interface DistributedExecution {
    executionId: string;
    goalId: string;
    plan: DistributedExecutionPlan;
    status: ExecutionStatus;
    startedAt: number;
    completedAt?: number;
    errors: string[];
    checkpoints: ExecutionCheckpoint[];
}
export interface ExecutionCheckpoint {
    checkpointId: string;
    executionId: string;
    completedPartitions: string[];
    timestamp: number;
}
export declare class DistributedExecutor {
    private registry;
    private planner;
    private _bus;
    private _consensus?;
    private executions;
    private clock;
    constructor(registry: NodeRegistry, planner: DistributedPlanner, _bus: DistributedEventBus, _consensus?: ConsensusEngine | undefined);
    executeDistributedGoal(goal: Goal, plan: ExecutionPlan): DistributedExecution;
    pauseExecution(executionId: string): void;
    resumeExecution(executionId: string): void;
    abortExecution(executionId: string): void;
    recoverExecution(executionId: string): DistributedExecution | undefined;
    private checkpoint;
    getExecution(executionId: string): DistributedExecution | undefined;
    getAllExecutions(): DistributedExecution[];
    getBus(): DistributedEventBus;
    getConsensus(): ConsensusEngine | undefined;
}
//# sourceMappingURL=DistributedExecutor.d.ts.map