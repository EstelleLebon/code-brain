"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryReconciliation = void 0;
class MemoryReconciliation {
    reconcile(entries, strategy) {
        if (entries.length === 0) {
            return {
                key: '',
                resolvedValue: undefined,
                strategy,
                confidence: 0,
                contributingNodes: [],
                conflictDetected: false,
            };
        }
        const key = entries[0].key;
        const contributingNodes = [...new Set(entries.map(e => e.nodeId))];
        switch (strategy) {
            case 'last_write_wins': {
                const best = entries.reduce((a, b) => {
                    if (b.timestamp > a.timestamp)
                        return b;
                    if (b.timestamp === a.timestamp && b.version > a.version)
                        return b;
                    return a;
                });
                return {
                    key,
                    resolvedValue: best.value,
                    strategy,
                    confidence: best.confidence,
                    contributingNodes,
                    conflictDetected: false,
                };
            }
            case 'confidence_merge': {
                const best = entries.reduce((a, b) => b.confidence > a.confidence ? b : a);
                const ties = entries.filter(e => e.confidence === best.confidence);
                const confidence = ties.length > 1
                    ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
                    : best.confidence;
                return {
                    key,
                    resolvedValue: best.value,
                    strategy,
                    confidence,
                    contributingNodes,
                    conflictDetected: false,
                };
            }
            case 'semantic_merge': {
                const merged = entries.map(e => String(e.value)).join(' | ');
                const avgConfidence = entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length;
                return {
                    key,
                    resolvedValue: merged,
                    strategy,
                    confidence: avgConfidence,
                    contributingNodes,
                    conflictDetected: false,
                };
            }
            case 'contradiction_aware': {
                let conflictDetected = false;
                for (let i = 0; i < entries.length; i++) {
                    for (let j = i + 1; j < entries.length; j++) {
                        if (entries[i].value !== entries[j].value &&
                            entries[i].confidence > 0.7 &&
                            entries[j].confidence > 0.7) {
                            conflictDetected = true;
                            break;
                        }
                    }
                    if (conflictDetected)
                        break;
                }
                const best = entries.reduce((a, b) => b.confidence > a.confidence ? b : a);
                return {
                    key,
                    resolvedValue: best.value,
                    strategy,
                    confidence: best.confidence,
                    contributingNodes,
                    conflictDetected,
                };
            }
        }
    }
    reconcileAll(entriesByKey, strategy) {
        const results = new Map();
        for (const [key, entries] of entriesByKey) {
            results.set(key, this.reconcile(entries, strategy));
        }
        return results;
    }
}
exports.MemoryReconciliation = MemoryReconciliation;
//# sourceMappingURL=MemoryReconciliation.js.map