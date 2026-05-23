"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveNode = void 0;
class CognitiveNode {
    nodeId;
    capabilities;
    state = 'idle';
    health;
    activeGoals = new Map();
    _executor;
    bus;
    stepResults = new Map();
    heartbeatCounter = 0;
    constructor(config) {
        this.nodeId = config.nodeId;
        this.capabilities = config.capabilities;
        this._executor = config.executor;
        this.bus = config.bus;
        this.health = {
            nodeId: config.nodeId,
            status: 'healthy',
            lastHeartbeat: 0,
            cpuLoad: 0,
            memoryLoad: 0,
            activeGoalCount: 0,
            errorRate: 0,
        };
    }
    assignGoal(goal) {
        if (!this.capabilities.canExecute)
            throw new Error(`Node ${this.nodeId} cannot execute goals`);
        if (this.activeGoals.size >= this.capabilities.maxConcurrentGoals) {
            throw new Error(`Node ${this.nodeId} at capacity`);
        }
        this.activeGoals.set(goal.id, goal);
        this.state = 'active';
        this.health.activeGoalCount = this.activeGoals.size;
        this.bus.publish({ type: 'goal_assigned', nodeId: this.nodeId, goalId: goal.id }, this.nodeId);
    }
    executeStep(stepId, operation) {
        if (this.state === 'paused')
            throw new Error(`Node ${this.nodeId} is paused`);
        if (this.state === 'failed')
            throw new Error(`Node ${this.nodeId} has failed`);
        try {
            const result = operation();
            this.stepResults.set(stepId, result);
            this.bus.publish({ type: 'step_completed', nodeId: this.nodeId, stepId, result }, this.nodeId);
            return result;
        }
        catch (err) {
            this.health.errorRate = Math.min(1, this.health.errorRate + 0.1);
            if (this.health.errorRate >= 0.5) {
                this.health.status = 'degraded';
                this.state = 'recovering';
            }
            throw err;
        }
    }
    pause() { this.state = 'paused'; }
    resume() { if (this.state === 'paused')
        this.state = 'active'; }
    snapshot() {
        return {
            nodeId: this.nodeId,
            state: this.state,
            health: { ...this.health },
            activeGoalIds: [...this.activeGoals.keys()],
        };
    }
    heartbeat() {
        this.heartbeatCounter++;
        this.health.lastHeartbeat = this.heartbeatCounter;
        if (this.state !== 'failed' && this.health.status !== 'isolated') {
            this.health.status = this.health.errorRate > 0.3 ? 'degraded' : 'healthy';
        }
        return { ...this.health };
    }
    getState() { return this.state; }
    getHealth() { return { ...this.health }; }
    getLoad() { return this.activeGoals.size / this.capabilities.maxConcurrentGoals; }
    getExecutor() { return this._executor; }
    markFailed() { this.state = 'failed'; this.health.status = 'failed'; }
    markIsolated() { this.health.status = 'isolated'; }
    removeGoal(goalId) {
        this.activeGoals.delete(goalId);
        this.health.activeGoalCount = this.activeGoals.size;
        if (this.activeGoals.size === 0)
            this.state = 'idle';
    }
}
exports.CognitiveNode = CognitiveNode;
//# sourceMappingURL=CognitiveNode.js.map