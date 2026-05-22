import { CognitiveMode } from './CognitiveMode.js';
import { getStrategy, type ExecutionStrategy } from './ExecutionStrategy.js';
import type { AggregatedLearningSignal } from '../cognitive-loop/LearningSignalAggregator.js';
import type { RiskLevel } from '../risk/RiskAssessmentEngine.js';

export interface ModeSelectorContext {
  calibratedRisk: RiskLevel;
  recentFailures: number;
  recentSuccesses: number;
  runtimeInstability: boolean;
  retrievalConfidence: number;   // 0-1
  isHotfix: boolean;
  learningSignal?: AggregatedLearningSignal;
}

export class ModeSelector {
  select(ctx: ModeSelectorContext): CognitiveMode {
    // Hotfix overrides everything
    if (ctx.isHotfix) return CognitiveMode.HOTFIX;

    // Recovery: too many failures or runtime instability
    if (ctx.recentFailures >= 3 || (ctx.runtimeInstability && ctx.recentFailures >= 1)) {
      return CognitiveMode.RECOVERY;
    }

    // LEARNING: degrading signal with runtime pipeline active
    if (ctx.learningSignal?.recentTrend === 'degrading') {
      return CognitiveMode.LEARNING;
    }

    // Critical risk → safe refactor
    if (ctx.calibratedRisk === 'critical' || ctx.calibratedRisk === 'high') {
      return CognitiveMode.SAFE_REFACTOR;
    }

    // Stable zone with high confidence → aggressive optimization
    if (
      ctx.calibratedRisk === 'low' &&
      ctx.recentSuccesses >= 5 &&
      ctx.recentFailures === 0 &&
      ctx.retrievalConfidence > 0.7
    ) {
      return CognitiveMode.AGGRESSIVE_OPTIMIZATION;
    }

    // Unknown territory → explore
    if (ctx.retrievalConfidence < 0.3) {
      return CognitiveMode.EXPLORATION;
    }

    return CognitiveMode.SAFE_REFACTOR;
  }

  selectWithStrategy(ctx: ModeSelectorContext): { mode: CognitiveMode; strategy: ExecutionStrategy } {
    const mode = this.select(ctx);
    return { mode, strategy: getStrategy(mode) };
  }
}
