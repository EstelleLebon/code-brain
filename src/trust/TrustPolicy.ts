import { RiskLevel } from '../risk/RiskAssessmentEngine.js';

export type ApprovalMode = 'auto' | 'review' | 'manual';

export interface TrustDecision {
  approved: boolean;
  requiresHumanReview: boolean;
  approvalMode: ApprovalMode;
  reasons: string[];
}

export interface TrustPolicy {
  name: string;
  maxAutoApproveRisk: RiskLevel;
  maxReviewRisk: RiskLevel;
}

export const DEFAULT_TRUST_POLICY: TrustPolicy = {
  name: 'default',
  maxAutoApproveRisk: 'low',
  maxReviewRisk: 'high',
};

export const CONSERVATIVE_TRUST_POLICY: TrustPolicy = {
  name: 'conservative',
  maxAutoApproveRisk: 'low',
  maxReviewRisk: 'medium',
};

export const PERMISSIVE_TRUST_POLICY: TrustPolicy = {
  name: 'permissive',
  maxAutoApproveRisk: 'medium',
  maxReviewRisk: 'high',
};

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function riskLte(a: RiskLevel, b: RiskLevel): boolean {
  return RISK_ORDER[a] <= RISK_ORDER[b];
}

export class TrustEvaluator {
  constructor(private policy: TrustPolicy = DEFAULT_TRUST_POLICY) {}

  evaluate(riskLevel: RiskLevel, reasons: string[]): TrustDecision {
    if (riskLte(riskLevel, this.policy.maxAutoApproveRisk)) {
      return {
        approved: true,
        requiresHumanReview: false,
        approvalMode: 'auto',
        reasons: [`Risk '${riskLevel}' ≤ auto-approve threshold '${this.policy.maxAutoApproveRisk}'`],
      };
    }

    if (riskLte(riskLevel, this.policy.maxReviewRisk)) {
      return {
        approved: false,
        requiresHumanReview: true,
        approvalMode: 'review',
        reasons: [
          `Risk '${riskLevel}' exceeds auto threshold, requires human review`,
          ...reasons.slice(0, 3),
        ],
      };
    }

    return {
      approved: false,
      requiresHumanReview: true,
      approvalMode: 'manual',
      reasons: [
        `Risk '${riskLevel}' is critical — manual approval only`,
        ...reasons.slice(0, 3),
      ],
    };
  }

  withPolicy(policy: TrustPolicy): TrustEvaluator {
    return new TrustEvaluator(policy);
  }
}
