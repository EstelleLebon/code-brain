"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureRecoveryPlanner = void 0;
const RollbackHeuristics_js_1 = require("./RollbackHeuristics.js");
class FailureRecoveryPlanner {
    heuristics = new RollbackHeuristics_js_1.RollbackHeuristics();
    plan(signals, affectedArtifacts, knownPatterns, failureSeverity) {
        // If we've seen this pattern before with high frequency → switch mode
        const knownHighFreq = knownPatterns.find(p => p.frequency >= 3 && p.severity >= 60);
        if (knownHighFreq) {
            return {
                strategy: 'switch_mode',
                confidence: 0.85,
                reason: `Repeated failure pattern '${knownHighFreq.operationType}' (freq=${knownHighFreq.frequency}) — switching cognitive mode to RECOVERY`,
                suggestedMode: 'RECOVERY',
            };
        }
        // High severity → rollback
        if (failureSeverity >= 70) {
            const rollback = this.heuristics.decide(signals, affectedArtifacts, failureSeverity);
            return {
                strategy: 'rollback',
                confidence: rollback.confidence,
                reason: rollback.reason,
                rollback,
            };
        }
        // Medium severity with few mutations → retry with reduced scope
        if (failureSeverity >= 40 && affectedArtifacts.length > 1) {
            return {
                strategy: 'reduce_scope',
                confidence: 0.65,
                reason: `Medium severity (${failureSeverity}) — reducing mutation scope to first affected artifact`,
                retryMaxMutations: 1,
            };
        }
        // Low severity → retry
        return {
            strategy: 'retry',
            confidence: 0.55,
            reason: `Low severity failure (${failureSeverity}) — retry may succeed`,
        };
    }
}
exports.FailureRecoveryPlanner = FailureRecoveryPlanner;
//# sourceMappingURL=FailureRecoveryPlanner.js.map