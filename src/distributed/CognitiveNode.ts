import type { AutonomousExecutor } from '../autonomous-execution/AutonomousExecutor.js';
import type { Goal } from '../goals/Goal.js';
import type { DistributedEventBus } from './DistributedEventBus.js';

export interface NodeCapabilities {
  canPlan: boolean;
  canExecute: boolean;
  canReplicate: boolean;
  canVote: boolean;
  maxConcurrentGoals: number;
  supportedOperationTypes: string[];
}

export interface NodeHealth {
  nodeId: string;
  status: 'healthy' | 'degraded' | 'isolated' | 'failed';
  lastHeartbeat: number;
  cpuLoad: number;
  memoryLoad: number;
  activeGoalCount: number;
  errorRate: number;
}

export type NodeState = 'idle' | 'active' | 'paused' | 'recovering' | 'failed';

export interface CognitiveNodeConfig {
  nodeId: string;
  capabilities: NodeCapabilities;
  executor?: AutonomousExecutor;
  bus: DistributedEventBus;
}

export class CognitiveNode {
  readonly nodeId: string;
  readonly capabilities: NodeCapabilities;
  private state: NodeState = 'idle';
  private health: NodeHealth;
  private activeGoals: Map<string, Goal> = new Map();
  private readonly _executor?: AutonomousExecutor;

  private bus: DistributedEventBus;
  private stepResults: Map<string, unknown> = new Map();
  private heartbeatCounter = 0;

  constructor(config: CognitiveNodeConfig) {
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

  assignGoal(goal: Goal): void {
    if (!this.capabilities.canExecute) throw new Error(`Node ${this.nodeId} cannot execute goals`);
    if (this.activeGoals.size >= this.capabilities.maxConcurrentGoals) {
      throw new Error(`Node ${this.nodeId} at capacity`);
    }
    this.activeGoals.set(goal.id, goal);
    this.state = 'active';
    this.health.activeGoalCount = this.activeGoals.size;
    this.bus.publish({ type: 'goal_assigned', nodeId: this.nodeId, goalId: goal.id }, this.nodeId);
  }

  executeStep(stepId: string, operation: () => unknown): unknown {
    if (this.state === 'paused') throw new Error(`Node ${this.nodeId} is paused`);
    if (this.state === 'failed') throw new Error(`Node ${this.nodeId} has failed`);
    try {
      const result = operation();
      this.stepResults.set(stepId, result);
      this.bus.publish({ type: 'step_completed', nodeId: this.nodeId, stepId, result }, this.nodeId);
      return result;
    } catch (err) {
      this.health.errorRate = Math.min(1, this.health.errorRate + 0.1);
      if (this.health.errorRate >= 0.5) {
        this.health.status = 'degraded';
        this.state = 'recovering';
      }
      throw err;
    }
  }

  pause(): void { this.state = 'paused'; }
  resume(): void { if (this.state === 'paused') this.state = 'active'; }

  snapshot(): { nodeId: string; state: NodeState; health: NodeHealth; activeGoalIds: string[] } {
    return {
      nodeId: this.nodeId,
      state: this.state,
      health: { ...this.health },
      activeGoalIds: [...this.activeGoals.keys()],
    };
  }

  heartbeat(): NodeHealth {
    this.heartbeatCounter++;
    this.health.lastHeartbeat = this.heartbeatCounter;
    if (this.state !== 'failed' && this.health.status !== 'isolated') {
      this.health.status = this.health.errorRate > 0.3 ? 'degraded' : 'healthy';
    }
    return { ...this.health };
  }

  getState(): NodeState { return this.state; }
  getHealth(): NodeHealth { return { ...this.health }; }
  getLoad(): number { return this.activeGoals.size / this.capabilities.maxConcurrentGoals; }
  getExecutor(): AutonomousExecutor | undefined { return this._executor; }

  markFailed(): void { this.state = 'failed'; this.health.status = 'failed'; }
  markIsolated(): void { this.health.status = 'isolated'; }
  removeGoal(goalId: string): void {
    this.activeGoals.delete(goalId);
    this.health.activeGoalCount = this.activeGoals.size;
    if (this.activeGoals.size === 0) this.state = 'idle';
  }
}
