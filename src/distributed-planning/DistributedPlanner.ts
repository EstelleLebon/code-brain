import type { ExecutionPlan } from '../planning/PlanGenerator.js';
import type { NodeRegistry } from '../distributed/NodeRegistry.js';

export interface PlannedOperation {
  id: string;
  type: string;
  payload?: unknown;
  dependencies?: string[];
}

export interface PlanPartition {
  partitionId: string;
  operations: PlannedOperation[];
  dependencies: string[];
  estimatedCost: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
}

export interface PartitionAssignment {
  partitionId: string;
  nodeId: string;
  assignedAt: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface DistributedExecutionPlan {
  originalPlanId: string;
  partitions: PlanPartition[];
  assignments: PartitionAssignment[];
  criticalPath: string[];
}

export class DistributedPlanner {
  private assignmentCounter = 0;

  constructor(private registry: NodeRegistry) {}

  partitionPlan(plan: ExecutionPlan): PlanPartition[] {
    // Convert ExecutionPlan steps to PlannedOperations
    const ops: PlannedOperation[] = (plan.steps ?? []).map(s => ({
      id: s.id,
      type: s.cognitiveMode ?? 'default',
      payload: s,
      dependencies: s.dependencies,
    }));

    const groups = new Map<string, PlannedOperation[]>();
    for (const op of ops) {
      const key = op.type || 'default';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(op);
    }

    const partitions: PlanPartition[] = [];
    let idx = 0;
    for (const [, groupOps] of groups) {
      partitions.push({
        partitionId: `partition-${idx++}`,
        operations: groupOps,
        dependencies: idx > 1 ? [`partition-${idx - 2}`] : [],
        estimatedCost: groupOps.length,
        priority: idx === 1 ? 'critical' : 'normal',
      });
    }

    if (partitions.length === 0 && ops.length > 0) {
      partitions.push({
        partitionId: 'partition-0',
        operations: ops,
        dependencies: [],
        estimatedCost: ops.length,
        priority: 'normal',
      });
    }
    return partitions;
  }

  assignPartitions(partitions: PlanPartition[]): PartitionAssignment[] {
    const assignments: PartitionAssignment[] = [];
    for (const partition of partitions) {
      const node = this.registry.leastLoaded();
      assignments.push({
        partitionId: partition.partitionId,
        nodeId: node?.nodeId ?? 'unassigned',
        assignedAt: this.assignmentCounter++,
        status: 'pending',
      });
    }
    return assignments;
  }

  rebalance(plan: DistributedExecutionPlan): DistributedExecutionPlan {
    const newAssignments = this.assignPartitions(plan.partitions);
    return { ...plan, assignments: newAssignments };
  }

  recoverPartition(plan: DistributedExecutionPlan, failedPartitionId: string): DistributedExecutionPlan {
    const updated = plan.assignments.map(a =>
      a.partitionId === failedPartitionId
        ? { ...a, nodeId: this.registry.leastLoaded()?.nodeId ?? 'unassigned', status: 'pending' as const }
        : a
    );
    return { ...plan, assignments: updated };
  }

  buildDistributedPlan(plan: ExecutionPlan): DistributedExecutionPlan {
    const partitions = this.partitionPlan(plan);
    const assignments = this.assignPartitions(partitions);
    const criticalPath = partitions
      .filter(p => p.priority === 'critical' || p.dependencies.length === 0)
      .map(p => p.partitionId);
    return {
      originalPlanId: plan.id || 'unknown',
      partitions,
      assignments,
      criticalPath,
    };
  }
}
