import { GoalType } from '../goals/Goal.js';
export interface StrategyRecord {
    goalType: GoalType;
    cognitiveMode: string;
    success: boolean;
    executionTimeMs: number;
    stepsCount: number;
    rollbackCount: number;
    timestamp: Date;
}
export declare class StrategyMemory {
    private records;
    recordStrategy(record: StrategyRecord): void;
    bestStrategies(goalType: GoalType): StrategyRecord[];
    failurePatterns(goalType: GoalType): StrategyRecord[];
    averageSuccessRate(goalType: GoalType): number;
}
//# sourceMappingURL=StrategyMemory.d.ts.map