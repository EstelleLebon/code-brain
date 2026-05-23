"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivergenceClassifier = void 0;
class DivergenceClassifier {
    classify(metrics) {
        const { contradictionCount, confidenceDrift, replayMismatch, consensusMismatch } = metrics;
        let severity;
        let recommendation;
        if ((contradictionCount > 5 || confidenceDrift > 0.7) &&
            consensusMismatch) {
            severity = 'catastrophic';
            recommendation = 'Immediate intervention required: halt replication, trigger manual reconciliation, and restore from last known good snapshot.';
        }
        else if (contradictionCount > 2 ||
            confidenceDrift >= 0.3 ||
            replayMismatch) {
            severity = 'dangerous';
            recommendation = 'Suspend writes, run full reconciliation pass, and re-sync affected nodes before resuming.';
        }
        else if (contradictionCount <= 2 && confidenceDrift < 0.3) {
            if (contradictionCount === 0 && !replayMismatch && !consensusMismatch) {
                severity = 'benign';
                recommendation = 'No action required; monitor confidence drift trends.';
            }
            else {
                severity = 'recoverable';
                recommendation = 'Apply confidence_merge reconciliation strategy and re-validate affected entries.';
            }
        }
        else {
            severity = 'benign';
            recommendation = 'No action required; monitor confidence drift trends.';
        }
        return { severity, metrics, recommendation };
    }
    classifyEntries(entries, replayMismatch, consensusMismatch) {
        // Group by key
        const byKey = new Map();
        for (const entry of entries) {
            const group = byKey.get(entry.key) ?? [];
            group.push(entry);
            byKey.set(entry.key, group);
        }
        let contradictionCount = 0;
        let confidenceDrift = 0;
        for (const group of byKey.values()) {
            // Count contradictions: pairs with different values, both confidence > 0.7
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    if (group[i].value !== group[j].value &&
                        group[i].confidence > 0.7 &&
                        group[j].confidence > 0.7) {
                        contradictionCount++;
                    }
                }
            }
            // Confidence drift: max abs difference in confidence for same key
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const drift = Math.abs(group[i].confidence - group[j].confidence);
                    if (drift > confidenceDrift)
                        confidenceDrift = drift;
                }
            }
        }
        const metrics = {
            contradictionCount,
            confidenceDrift,
            replayMismatch,
            consensusMismatch,
        };
        return this.classify(metrics);
    }
}
exports.DivergenceClassifier = DivergenceClassifier;
//# sourceMappingURL=DivergenceClassifier.js.map