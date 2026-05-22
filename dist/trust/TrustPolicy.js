"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustEvaluator = exports.PERMISSIVE_TRUST_POLICY = exports.CONSERVATIVE_TRUST_POLICY = exports.DEFAULT_TRUST_POLICY = void 0;
exports.DEFAULT_TRUST_POLICY = {
    name: 'default',
    maxAutoApproveRisk: 'low',
    maxReviewRisk: 'high',
};
exports.CONSERVATIVE_TRUST_POLICY = {
    name: 'conservative',
    maxAutoApproveRisk: 'low',
    maxReviewRisk: 'medium',
};
exports.PERMISSIVE_TRUST_POLICY = {
    name: 'permissive',
    maxAutoApproveRisk: 'medium',
    maxReviewRisk: 'high',
};
const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
function riskLte(a, b) {
    return RISK_ORDER[a] <= RISK_ORDER[b];
}
class TrustEvaluator {
    policy;
    constructor(policy = exports.DEFAULT_TRUST_POLICY) {
        this.policy = policy;
    }
    evaluate(riskLevel, reasons) {
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
    withPolicy(policy) {
        return new TrustEvaluator(policy);
    }
}
exports.TrustEvaluator = TrustEvaluator;
//# sourceMappingURL=TrustPolicy.js.map