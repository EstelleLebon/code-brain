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
export declare class CognitiveNode {
    readonly nodeId: string;
    readonly capabilities: NodeCapabilities;
    private state;
    private health;
    private activeGoals;
    private readonly _executor?;
    private bus;
    private stepResults;
    private heartbeatCounter;
    constructor(config: CognitiveNodeConfig);
    assignGoal(goal: Goal): void;
    executeStep(stepId: string, operation: () => unknown): unknown;
    pause(): void;
    resume(): void;
    snapshot(): {
        nodeId: string;
        state: NodeState;
        health: NodeHealth;
        activeGoalIds: string[];
    };
    heartbeat(): NodeHealth;
    getState(): NodeState;
    getHealth(): NodeHealth;
    getLoad(): number;
    getExecutor(): AutonomousExecutor | undefined;
    markFailed(): void;
    markIsolated(): void;
    removeGoal(goalId: string): void;
}
//# sourceMappingURL=CognitiveNode.d.ts.map