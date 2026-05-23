"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedExecutor = void 0;
class DistributedExecutor {
    registry;
    planner;
    _bus;
    _consensus;
    executions = new Map();
    clock = 0;
    constructor(registry, planner, _bus, _consensus) {
        this.registry = registry;
        this.planner = planner;
        this._bus = _bus;
        this._consensus = _consensus;
    }
    executeDistributedGoal(goal, plan) {
        const distPlan = this.planner.buildDistributedPlan(plan);
        const executionId = `exec-${this.clock++}`;
        const execution = {
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
            }
            catch (err) {
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
    pauseExecution(executionId) {
        const exec = this.executions.get(executionId);
        if (!exec)
            return;
        exec.status = 'paused';
        for (const a of exec.plan.assignments) {
            this.registry.getNode(a.nodeId)?.pause();
        }
    }
    resumeExecution(executionId) {
        const exec = this.executions.get(executionId);
        if (!exec || exec.status !== 'paused')
            return;
        exec.status = 'running';
        for (const a of exec.plan.assignments) {
            this.registry.getNode(a.nodeId)?.resume();
        }
    }
    abortExecution(executionId) {
        const exec = this.executions.get(executionId);
        if (!exec)
            return;
        exec.status = 'aborted';
        exec.completedAt = this.clock++;
    }
    recoverExecution(executionId) {
        const exec = this.executions.get(executionId);
        if (!exec || exec.status !== 'failed')
            return exec;
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
    checkpoint(exec) {
        exec.checkpoints.push({
            checkpointId: `ckpt-${this.clock++}`,
            executionId: exec.executionId,
            completedPartitions: exec.plan.assignments.filter(a => a.status === 'completed').map(a => a.partitionId),
            timestamp: this.clock,
        });
    }
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    getAllExecutions() {
        return [...this.executions.values()];
    }
    getBus() { return this._bus; }
    getConsensus() { return this._consensus; }
}
exports.DistributedExecutor = DistributedExecutor;
//# sourceMappingURL=DistributedExecutor.js.map