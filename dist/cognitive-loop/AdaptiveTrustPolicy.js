"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveTrustPolicy = void 0;
const TrustPolicy_js_1 = require("../trust/TrustPolicy.js");
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
function shiftRisk(level, delta) {
    const idx = Math.max(0, Math.min(3, RISK_LEVELS.indexOf(level) + delta));
    return RISK_LEVELS[idx];
}
class AdaptiveTrustPolicy {
    base;
    state = {
        confidence: 0.5,
        recentFailures: 0,
        recentSuccesses: 0,
        calibratedRiskDelta: 0,
    };
    windowSize;
    constructor(base = TrustPolicy_js_1.DEFAULT_TRUST_POLICY, windowSize = 10) {
        this.base = base;
        this.windowSize = windowSize;
    }
    recordSuccess() {
        this.state.recentSuccesses = Math.min(this.windowSize, this.state.recentSuccesses + 1);
        this.state.recentFailures = Math.max(0, this.state.recentFailures - 1);
        this.recalibrate();
    }
    recordFailure() {
        this.state.recentFailures = Math.min(this.windowSize, this.state.recentFailures + 1);
        this.state.recentSuccesses = Math.max(0, this.state.recentSuccesses - 1);
        this.recalibrate();
    }
    recalibrate() {
        const total = this.state.recentSuccesses + this.state.recentFailures;
        this.state.confidence = total === 0 ? 0.5 : this.state.recentSuccesses / total;
        // Shift thresholds based on failure/success ratio
        // Heavy failures → more conservative (positive delta = stricter thresholds)
        // Heavy successes → more permissive (negative delta)
        if (this.state.recentFailures >= 3) {
            this.state.calibratedRiskDelta = -1; // tighten: shift allowed risk down
        }
        else if (this.state.recentSuccesses >= 5 && this.state.recentFailures === 0) {
            this.state.calibratedRiskDelta = 1; // loosen: shift allowed risk up
        }
        else {
            this.state.calibratedRiskDelta = 0;
        }
    }
    currentPolicy() {
        const delta = this.state.calibratedRiskDelta;
        if (delta === 0)
            return this.base;
        return {
            name: `${this.base.name}-adaptive`,
            maxAutoApproveRisk: shiftRisk(this.base.maxAutoApproveRisk, delta),
            maxReviewRisk: shiftRisk(this.base.maxReviewRisk, delta),
        };
    }
    getState() {
        return { ...this.state };
    }
    reset() {
        this.state = { confidence: 0.5, recentFailures: 0, recentSuccesses: 0, calibratedRiskDelta: 0 };
    }
}
exports.AdaptiveTrustPolicy = AdaptiveTrustPolicy;
//# sourceMappingURL=AdaptiveTrustPolicy.js.map