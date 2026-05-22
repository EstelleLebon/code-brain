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
export declare const DEFAULT_TRUST_POLICY: TrustPolicy;
export declare const CONSERVATIVE_TRUST_POLICY: TrustPolicy;
export declare const PERMISSIVE_TRUST_POLICY: TrustPolicy;
export declare class TrustEvaluator {
    private policy;
    constructor(policy?: TrustPolicy);
    evaluate(riskLevel: RiskLevel, reasons: string[]): TrustDecision;
    withPolicy(policy: TrustPolicy): TrustEvaluator;
}
//# sourceMappingURL=TrustPolicy.d.ts.map