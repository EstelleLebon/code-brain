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

export class StrategyMemory {
  private records: StrategyRecord[] = [];

  recordStrategy(record: StrategyRecord): void {
    this.records.push({ ...record });
  }

  bestStrategies(goalType: GoalType): StrategyRecord[] {
    return this.records
      .filter(r => r.goalType === goalType && r.success)
      .sort((a, b) => a.executionTimeMs - b.executionTimeMs);
  }

  failurePatterns(goalType: GoalType): StrategyRecord[] {
    return this.records.filter(r => r.goalType === goalType && !r.success);
  }

  averageSuccessRate(goalType: GoalType): number {
    const relevant = this.records.filter(r => r.goalType === goalType);
    if (relevant.length === 0) return 0;
    const successes = relevant.filter(r => r.success).length;
    return successes / relevant.length;
  }
}
