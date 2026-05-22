import { GoalType } from '../goals/Goal.js';
import { StrategyMemory } from './StrategyMemory.js';

export class PlanningHeuristics {
  constructor(private memory: StrategyMemory) {}

  preferSmallPlans(goalType: GoalType): boolean {
    // True if high failure rate (instability detected)
    const successRate = this.memory.averageSuccessRate(goalType);
    const failures = this.memory.failurePatterns(goalType);
    return successRate < 0.5 || failures.length >= 3;
  }

  preferParallelism(goalType: GoalType): boolean {
    // True if stable history (high success rate with low rollback)
    const best = this.memory.bestStrategies(goalType);
    if (best.length === 0) return false;
    const avgRollback = best.reduce((s, r) => s + r.rollbackCount, 0) / best.length;
    return this.memory.averageSuccessRate(goalType) > 0.8 && avgRollback < 1;
  }

  isDangerousPattern(goalType: GoalType, cognitiveMode: string): boolean {
    const failures = this.memory.failurePatterns(goalType);
    const modeFailures = failures.filter(f => f.cognitiveMode === cognitiveMode);
    return modeFailures.length >= 2;
  }

  shouldReduceMutations(goalType: GoalType): boolean {
    const failures = this.memory.failurePatterns(goalType);
    if (failures.length === 0) return false;
    const avgRollback = failures.reduce((s, r) => s + r.rollbackCount, 0) / failures.length;
    return avgRollback > 2;
  }
}
