"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedPlanner = void 0;
class DistributedPlanner {
    registry;
    assignmentCounter = 0;
    constructor(registry) {
        this.registry = registry;
    }
    partitionPlan(plan) {
        // Convert ExecutionPlan steps to PlannedOperations
        const ops = (plan.steps ?? []).map(s => ({
            id: s.id,
            type: s.cognitiveMode ?? 'default',
            payload: s,
            dependencies: s.dependencies,
        }));
        const groups = new Map();
        for (const op of ops) {
            const key = op.type || 'default';
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(op);
        }
        const partitions = [];
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
    assignPartitions(partitions) {
        const assignments = [];
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
    rebalance(plan) {
        const newAssignments = this.assignPartitions(plan.partitions);
        return { ...plan, assignments: newAssignments };
    }
    recoverPartition(plan, failedPartitionId) {
        const updated = plan.assignments.map(a => a.partitionId === failedPartitionId
            ? { ...a, nodeId: this.registry.leastLoaded()?.nodeId ?? 'unassigned', status: 'pending' }
            : a);
        return { ...plan, assignments: updated };
    }
    buildDistributedPlan(plan) {
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
exports.DistributedPlanner = DistributedPlanner;
//# sourceMappingURL=DistributedPlanner.js.map