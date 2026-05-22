"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryEvaluator = void 0;
function scoreOutcome(outcome) {
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
    if (!outcome.eventualSuccess)
        score -= 0.3;
    return Math.max(0, score);
}
function classify(score) {
    if (score >= 0.8)
        return 'excellent';
    if (score >= 0.5)
        return 'acceptable';
    if (score >= 0.2)
        return 'poor';
    return 'catastrophic';
}
class RecoveryEvaluator {
    _outcomes = [];
    evaluate(params) {
        const score = scoreOutcome(params);
        const quality = classify(score);
        const outcome = { ...params, score, quality };
        this._outcomes.push(outcome);
        return outcome;
    }
    summary() {
        const outcomes = [...this._outcomes];
        if (outcomes.length === 0) {
            return {
                outcomes: [],
                meanScore: 1,
                qualityDistribution: { excellent: 0, acceptable: 0, poor: 0, catastrophic: 0 },
            };
        }
        const meanScore = outcomes.reduce((s, o) => s + o.score, 0) / outcomes.length;
        const dist = {
            excellent: 0, acceptable: 0, poor: 0, catastrophic: 0,
        };
        for (const o of outcomes)
            dist[o.quality]++;
        const sorted = [...outcomes].sort((a, b) => a.score - b.score);
        return {
            outcomes,
            meanScore,
            qualityDistribution: dist,
            worstCase: sorted[0],
            bestCase: sorted[sorted.length - 1],
        };
    }
    reset() {
        this._outcomes = [];
    }
}
exports.RecoveryEvaluator = RecoveryEvaluator;
//# sourceMappingURL=RecoveryEvaluator.js.map