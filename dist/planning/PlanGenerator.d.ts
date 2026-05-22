import { Goal } from '../goals/Goal.js';
import { ExecutionGraph } from './ExecutionGraph.js';
export interface ExecutionStep {
    id: string;
    goalId: string;
    label: string;
    estimatedRisk: number;
    dependencies: string[];
    cognitiveMode: string;
    rollbackStrategy: 'none' | 'revert' | 'compensate' | 'abort';
}
export interface ExecutionPlan {
    id: string;
    goals: Goal[];
    steps: ExecutionStep[];
    graph: ExecutionGraph;
    createdAt: Date;
    estimatedTotalRisk: number;
}
export declare class PlanGenerator {
    generate(goals: Goal[]): ExecutionPlan;
    private _flattenGoals;
}
//# sourceMappingURL=PlanGenerator.d.ts.map