import { SemanticOperation } from '../semantic-ir/types.js';
import { RiskAssessment, RiskAssessmentEngine, RiskLevel, scoreToLevel } from './RiskAssessmentEngine.js';
import { RiskCalibration } from '../calibration/RiskCalibration.js';
import { FailureMemory } from '../failure-memory/FailureMemory.js';

export interface RuntimeRiskContext {
  affectedFileCount?: number;
  dependencyDepth?: number;
  referencingSymbolCount?: number;
  structuralContext?: string[];
  runtimeInstabilityScore?: number;
}

export interface RuntimeAwareRiskAssessment extends RiskAssessment {
  calibratedScore: number;
  calibratedLevel: RiskLevel;
  failurePatternMatch: boolean;
  failurePatternIds: string[];
}

export class RuntimeAwareRiskAssessor {
  private base = new RiskAssessmentEngine();
  readonly calibration = new RiskCalibration();
  readonly failureMemory: FailureMemory;

  constructor(failureMemory?: FailureMemory) {
    this.failureMemory = failureMemory ?? new FailureMemory();
  }

  assess(operation: SemanticOperation, context?: RuntimeRiskContext): RuntimeAwareRiskAssessment {
    const base = this.base.assess(operation, context);

    let score = base.score;
    const reasons = [...base.reasons];

    if (context?.runtimeInstabilityScore && context.runtimeInstabilityScore > 0) {
      const delta = Math.round(context.runtimeInstabilityScore * 0.3);
      score = Math.min(100, score + delta);
      reasons.push(`+${delta} runtime instability adjustment`);
    }

    const patterns = this.failureMemory.search(
      operation.operationType,
      context?.structuralContext?.[0],
    );
    const failurePatternMatch = patterns.length > 0;
    if (failurePatternMatch) {
      const severityBoost = Math.min(20, patterns[0].severity * 2);
      score = Math.min(100, score + severityBoost);
      reasons.push(
        `+${severityBoost} historical failure pattern (${patterns[0].id}), freq=${patterns[0].frequency}`,
      );
    }

    const calibratedScore = Math.round(
      this.calibration.predict(operation.operationType, score),
    );
    const calibratedLevel = scoreToLevel(calibratedScore);

    return {
      ...base,
      score,
      level: scoreToLevel(score),
      reasons,
      calibratedScore,
      calibratedLevel,
      failurePatternMatch,
      failurePatternIds: patterns.map(p => p.id),
    };
  }
}
