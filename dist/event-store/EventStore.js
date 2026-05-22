"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStore = void 0;
const CognitiveEvent_js_1 = require("./CognitiveEvent.js");
class EventStore {
    _events = [];
    _snapshots = new Map();
    append(event) {
        this._events.push(Object.freeze({ ...event }));
    }
    appendBatch(events) {
        for (const e of events)
            this.append(e);
    }
    stream(executionId) {
        return this._events.filter(e => e.executionId === executionId);
    }
    query(filter) {
        return this._events.filter(e => {
            if (filter.executionId && e.executionId !== filter.executionId)
                return false;
            if (filter.eventTypes && !filter.eventTypes.includes(e.eventType))
                return false;
            if (filter.since && e.timestamp < filter.since)
                return false;
            if (filter.until && e.timestamp > filter.until)
                return false;
            if (filter.correlationId && e.correlationId !== filter.correlationId)
                return false;
            return true;
        });
    }
    since(timestamp) {
        return this._events.filter(e => e.timestamp >= timestamp);
    }
    all() {
        return [...this._events];
    }
    snapshot() {
        const snap = Object.freeze({
            id: (0, CognitiveEvent_js_1.makeEventId)(),
            createdAt: new Date(),
            eventCount: this._events.length,
            events: Object.freeze([...this._events]),
        });
        this._snapshots.set(snap.id, snap);
        return snap;
    }
    getSnapshot(id) {
        return this._snapshots.get(id);
    }
    listSnapshots() {
        return [...this._snapshots.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    clear() {
        this._events = [];
    }
    get size() {
        return this._events.length;
    }
}
exports.EventStore = EventStore;
//# sourceMappingURL=EventStore.js.map