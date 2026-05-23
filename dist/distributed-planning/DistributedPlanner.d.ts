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
export declare class DistributedPlanner {
    private registry;
    private assignmentCounter;
    constructor(registry: NodeRegistry);
    partitionPlan(plan: ExecutionPlan): PlanPartition[];
    assignPartitions(partitions: PlanPartition[]): PartitionAssignment[];
    rebalance(plan: DistributedExecutionPlan): DistributedExecutionPlan;
    recoverPartition(plan: DistributedExecutionPlan, failedPartitionId: string): DistributedExecutionPlan;
    buildDistributedPlan(plan: ExecutionPlan): DistributedExecutionPlan;
}
//# sourceMappingURL=DistributedPlanner.d.ts.map