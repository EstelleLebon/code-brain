import { GoalType } from '../goals/Goal.js';
import { StrategyMemory } from './StrategyMemory.js';
export declare class PlanningHeuristics {
    private memory;
    constructor(memory: StrategyMemory);
    preferSmallPlans(goalType: GoalType): boolean;
    preferParallelism(goalType: GoalType): boolean;
    isDangerousPattern(goalType: GoalType, cognitiveMode: string): boolean;
    shouldReduceMutations(goalType: GoalType): boolean;
}
//# sourceMappingURL=PlanningHeuristics.d.ts.map