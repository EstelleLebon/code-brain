"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeAwareRiskAssessor = void 0;
const RiskAssessmentEngine_js_1 = require("./RiskAssessmentEngine.js");
const RiskCalibration_js_1 = require("../calibration/RiskCalibration.js");
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
class RuntimeAwareRiskAssessor {
    base = new RiskAssessmentEngine_js_1.RiskAssessmentEngine();
    calibration = new RiskCalibration_js_1.RiskCalibration();
    failureMemory;
    constructor(failureMemory) {
        this.failureMemory = failureMemory ?? new FailureMemory_js_1.FailureMemory();
    }
    assess(operation, context) {
        const base = this.base.assess(operation, context);
        let score = base.score;
        const reasons = [...base.reasons];
        if (context?.runtimeInstabilityScore && context.runtimeInstabilityScore > 0) {
            const delta = Math.round(context.runtimeInstabilityScore * 0.3);
            score = Math.min(100, score + delta);
            reasons.push(`+${delta} runtime instability adjustment`);
        }
        const patterns = this.failureMemory.search(operation.operationType, context?.structuralContext?.[0]);
        const failurePatternMatch = patterns.length > 0;
        if (failurePatternMatch) {
            const severityBoost = Math.min(20, patterns[0].severity * 2);
            score = Math.min(100, score + severityBoost);
            reasons.push(`+${severityBoost} historical failure pattern (${patterns[0].id}), freq=${patterns[0].frequency}`);
        }
        const calibratedScore = Math.round(this.calibration.predict(operation.operationType, score));
        const calibratedLevel = (0, RiskAssessmentEngine_js_1.scoreToLevel)(calibratedScore);
        return {
            ...base,
            score,
            level: (0, RiskAssessmentEngine_js_1.scoreToLevel)(score),
            reasons,
            calibratedScore,
            calibratedLevel,
            failurePatternMatch,
            failurePatternIds: patterns.map(p => p.id),
        };
    }
}
exports.RuntimeAwareRiskAssessor = RuntimeAwareRiskAssessor;
//# sourceMappingURL=RuntimeAwareRiskAssessor.js.map