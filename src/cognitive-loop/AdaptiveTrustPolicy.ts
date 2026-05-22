import { TrustPolicy, DEFAULT_TRUST_POLICY } from '../trust/TrustPolicy.js';
import type { RiskLevel } from '../risk/RiskAssessmentEngine.js';

export interface AdaptiveTrustState {
  confidence: number;        // 0-1
  recentFailures: number;
  recentSuccesses: number;
  calibratedRiskDelta: number;
}

const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

function shiftRisk(level: RiskLevel, delta: number): RiskLevel {
  const idx = Math.max(0, Math.min(3, RISK_LEVELS.indexOf(level) + delta));
  return RISK_LEVELS[idx];
}

export class AdaptiveTrustPolicy {
  private state: AdaptiveTrustState = {
    confidence: 0.5,
    recentFailures: 0,
    recentSuccesses: 0,
    calibratedRiskDelta: 0,
  };

  private readonly windowSize: number;

  constructor(
    private base: TrustPolicy = DEFAULT_TRUST_POLICY,
    windowSize = 10,
  ) {
    this.windowSize = windowSize;
  }

  recordSuccess(): void {
    this.state.recentSuccesses = Math.min(this.windowSize, this.state.recentSuccesses + 1);
    this.state.recentFailures = Math.max(0, this.state.recentFailures - 1);
    this.recalibrate();
  }

  recordFailure(): void {
    this.state.recentFailures = Math.min(this.windowSize, this.state.recentFailures + 1);
    this.state.recentSuccesses = Math.max(0, this.state.recentSuccesses - 1);
    this.recalibrate();
  }

  private recalibrate(): void {
    const total = this.state.recentSuccesses + this.state.recentFailures;
    this.state.confidence = total === 0 ? 0.5 : this.state.recentSuccesses / total;

    // Shift thresholds based on failure/success ratio
    // Heavy failures → more conservative (positive delta = stricter thresholds)
    // Heavy successes → more permissive (negative delta)
    if (this.state.recentFailures >= 3) {
      this.state.calibratedRiskDelta = -1; // tighten: shift allowed risk down
    } else if (this.state.recentSuccesses >= 5 && this.state.recentFailures === 0) {
      this.state.calibratedRiskDelta = 1;  // loosen: shift allowed risk up
    } else {
      this.state.calibratedRiskDelta = 0;
    }
  }

  currentPolicy(): TrustPolicy {
    const delta = this.state.calibratedRiskDelta;
    if (delta === 0) return this.base;

    return {
      name: `${this.base.name}-adaptive`,
      maxAutoApproveRisk: shiftRisk(this.base.maxAutoApproveRisk, delta),
      maxReviewRisk: shiftRisk(this.base.maxReviewRisk, delta),
    };
  }

  getState(): Readonly<AdaptiveTrustState> {
    return { ...this.state };
  }

  reset(): void {
    this.state = { confidence: 0.5, recentFailures: 0, recentSuccesses: 0, calibratedRiskDelta: 0 };
  }
}
