"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeSignalAggregator = void 0;
class RuntimeSignalAggregator {
    signals = [];
    add(signal) {
        this.signals.push(signal);
    }
    addMany(signals) {
        for (const s of signals)
            this.signals.push(s);
    }
    aggregate() {
        const byType = {};
        for (const s of this.signals) {
            if (!byType[s.signalType])
                byType[s.signalType] = [];
            byType[s.signalType].push(s);
        }
        const hasFailures = this.signals.some(s => s.status === 'failure');
        const hasWarnings = this.signals.some(s => s.status === 'warning');
        const overallStatus = hasFailures
            ? 'failure'
            : hasWarnings
                ? 'warning'
                : 'success';
        return {
            byType,
            overallStatus,
            hasFailures,
            hasWarnings,
            totalCount: this.signals.length,
        };
    }
    forType(type) {
        return this.signals.filter(s => s.signalType === type);
    }
    since(timestamp) {
        return this.signals.filter(s => s.timestamp >= timestamp);
    }
    clear() {
        this.signals = [];
    }
    all() {
        return [...this.signals];
    }
}
exports.RuntimeSignalAggregator = RuntimeSignalAggregator;
//# sourceMappingURL=RuntimeSignalAggregator.js.map