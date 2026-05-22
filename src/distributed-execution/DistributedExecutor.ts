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

export class DistributedExecutor {
  private executions: Map<string, DistributedExecution> = new Map();
  private clock = 0;

  constructor(
    private registry: NodeRegistry,
    private planner: DistributedPlanner,
    private _bus: DistributedEventBus,
    private _consensus?: ConsensusEngine
  ) {}

  executeDistributedGoal(goal: Goal, plan: ExecutionPlan): DistributedExecution {
    const distPlan = this.planner.buildDistributedPlan(plan);
    const executionId = `exec-${this.clock++}`;

    const execution: DistributedExecution = {
      executionId,
      goalId: goal.id,
      plan: distPlan,
      status: 'running',
      startedAt: this.clock,
      errors: [],
      checkpoints: [],
    };

    this.executions.set(executionId, execution);

    for (const assignment of distPlan.assignments) {
      const node = this.registry.getNode(assignment.nodeId);
      if (!node) {
        execution.errors.push(`Node ${assignment.nodeId} not found for partition ${assignment.partitionId}`);
        continue;
      }
      try {
        node.assignGoal(goal);
        assignment.status = 'running';
      } catch (err) {
        execution.errors.push(`Failed to assign partition ${assignment.partitionId}: ${String(err)}`);
        assignment.status = 'failed';
      }
    }

    if (execution.errors.length > 0 && distPlan.assignments.every(a => a.status === 'failed')) {
      execution.status = 'failed';
    }

    this.checkpoint(execution);
    return execution;
  }

  pauseExecution(executionId: string): void {
    const exec = this.executions.get(executionId);
    if (!exec) return;
    exec.status = 'paused';
    for (const a of exec.plan.assignments) {
      this.registry.getNode(a.nodeId)?.pause();
    }
  }

  resumeExecution(executionId: string): void {
    const exec = this.executions.get(executionId);
    if (!exec || exec.status !== 'paused') return;
    exec.status = 'running';
    for (const a of exec.plan.assignments) {
      this.registry.getNode(a.nodeId)?.resume();
    }
  }

  abortExecution(executionId: string): void {
    const exec = this.executions.get(executionId);
    if (!exec) return;
    exec.status = 'aborted';
    exec.completedAt = this.clock++;
  }

  recoverExecution(executionId: string): DistributedExecution | undefined {
    const exec = this.executions.get(executionId);
    if (!exec || exec.status !== 'failed') return exec;

    exec.status = 'recovering';
    const failedPartitions = exec.plan.assignments.filter(a => a.status === 'failed');

    for (const assignment of failedPartitions) {
      const newNode = this.registry.leastLoaded();
      if (newNode) {
        assignment.nodeId = newNode.nodeId;
        assignment.status = 'pending';
      }
    }

    const recovered = this.planner.recoverPartition(exec.plan, failedPartitions[0]?.partitionId ?? '');
    exec.plan = recovered;
    exec.status = 'running';
    exec.errors = [];
    this.checkpoint(exec);
    return exec;
  }

  private checkpoint(exec: DistributedExecution): void {
    exec.checkpoints.push({
      checkpointId: `ckpt-${this.clock++}`,
      executionId: exec.executionId,
      completedPartitions: exec.plan.assignments.filter(a => a.status === 'completed').map(a => a.partitionId),
      timestamp: this.clock,
    });
  }

  getExecution(executionId: string): DistributedExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): DistributedExecution[] {
    return [...this.executions.values()];
  }

  getBus(): DistributedEventBus { return this._bus; }
  getConsensus(): ConsensusEngine | undefined { return this._consensus; }
}
