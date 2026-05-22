export type RecoveryQuality = 'excellent' | 'acceptable' | 'poor' | 'catastrophic';

export interface RecoveryOutcome {
  executionId: string;
  rollbackDepth: number;
  recoveryDurationMs: number;
  collateralSteps: number; // steps affected beyond target
  repeatedFailures: number; // same step failed more than once
  eventualSuccess: boolean;
  quality: RecoveryQuality;
  score: number; // 0–1
}

export interface RecoveryEvaluation {
  outcomes: RecoveryOutcome[];
  meanScore: number;
  qualityDistribution: Record<RecoveryQuality, number>;
  worstCase?: RecoveryOutcome;
  bestCase?: RecoveryOutcome;
}

function scoreOutcome(outcome: Omit<RecoveryOutcome, 'quality' | 'score'>): number {
  let score = 1.0;
  // Penalise rollback depth
  score -= Math.min(0.3, outcome.rollbackDepth * 0.05);
  // Penalise slow recovery (>2s is bad)
  score -= Math.min(0.2, outcome.recoveryDurationMs / 10000);
  // Penalise collateral damage
  score -= Math.min(0.2, outcome.collateralSteps * 0.04);
  // Penalise repeated failures
  score -= Math.min(0.2, outcome.repeatedFailures * 0.1);
  // Reward eventual success
  if (!outcome.eventualSuccess) score -= 0.3;
  return Math.max(0, score);
}

function classify(score: number): RecoveryQuality {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.5) return 'acceptable';
  if (score >= 0.2) return 'poor';
  return 'catastrophic';
}

export class RecoveryEvaluator {
  private _outcomes: RecoveryOutcome[] = [];

  evaluate(params: Omit<RecoveryOutcome, 'quality' | 'score'>): RecoveryOutcome {
    const score = scoreOutcome(params);
    const quality = classify(score);
    const outcome: RecoveryOutcome = { ...params, score, quality };
    this._outcomes.push(outcome);
    return outcome;
  }

  summary(): RecoveryEvaluation {
    const outcomes = [...this._outcomes];
    if (outcomes.length === 0) {
      return {
        outcomes: [],
        meanScore: 1,
        qualityDistribution: { excellent: 0, acceptable: 0, poor: 0, catastrophic: 0 },
      };
    }

    const meanScore = outcomes.reduce((s, o) => s + o.score, 0) / outcomes.length;
    const dist: Record<RecoveryQuality, number> = {
      excellent: 0, acceptable: 0, poor: 0, catastrophic: 0,
    };
    for (const o of outcomes) dist[o.quality]++;

    const sorted = [...outcomes].sort((a, b) => a.score - b.score);
    return {
      outcomes,
      meanScore,
      qualityDistribution: dist,
      worstCase: sorted[0],
      bestCase: sorted[sorted.length - 1],
    };
  }

  reset(): void {
    this._outcomes = [];
  }
}
