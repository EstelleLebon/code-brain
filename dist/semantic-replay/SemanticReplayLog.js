"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticReplayLog = void 0;
class SemanticReplayLog {
    events = [];
    record(event) {
        const full = {
            ...event,
            id: `sre_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
        };
        this.events.push(full);
        return full;
    }
    query(filter = {}) {
        return this.events.filter(e => {
            if (filter.operationType && e.operationType !== filter.operationType)
                return false;
            if (filter.transformationId && e.transformationId !== filter.transformationId)
                return false;
            if (filter.status && e.status !== filter.status)
                return false;
            if (filter.since && e.timestamp < filter.since)
                return false;
            return true;
        });
    }
    getByTransformation(transformationId) {
        return this.query({ transformationId });
    }
    canReplay(transformationId) {
        const events = this.getByTransformation(transformationId);
        return events.length > 0 && events.every(e => e.status === 'applied');
    }
    clear() {
        this.events = [];
    }
    get size() {
        return this.events.length;
    }
}
exports.SemanticReplayLog = SemanticReplayLog;
//# sourceMappingURL=SemanticReplayLog.js.map