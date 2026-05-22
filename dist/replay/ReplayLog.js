"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayLog = void 0;
class ReplayLog {
    events = [];
    record(eventType, artifactIds, transactionId, metadata) {
        const event = {
            id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            eventType,
            artifactIds,
            transactionId,
            metadata,
        };
        this.events.push(event);
        return event;
    }
    getEvents() { return [...this.events]; }
    getEventsByType(type) {
        return this.events.filter(e => e.eventType === type);
    }
    getEventsByTransaction(transactionId) {
        return this.events.filter(e => e.transactionId === transactionId);
    }
    since(timestamp) {
        return this.events.filter(e => e.timestamp >= timestamp);
    }
    clear() { this.events = []; }
}
exports.ReplayLog = ReplayLog;
//# sourceMappingURL=ReplayLog.js.map