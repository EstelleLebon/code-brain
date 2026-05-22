"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayEngine = void 0;
class ReplayEngine {
    store;
    snapshots;
    _handlers = [];
    constructor(store, snapshots) {
        this.store = store;
        this.snapshots = snapshots;
    }
    onEvent(handler) {
        this._handlers.push(handler);
    }
    async replay(executionId) {
        const events = this.store.stream(executionId);
        const start = new Date();
        for (const e of events) {
            for (const h of this._handlers)
                await h(e);
        }
        return {
            executionId,
            eventsReplayed: events.length,
            startedAt: start,
            completedAt: new Date(),
            fromSnapshot: false,
        };
    }
    async replayFrom(snapshotId) {
        const snap = this.snapshots.restoreSnapshot(snapshotId);
        if (!snap)
            throw new Error(`Snapshot not found: ${snapshotId}`);
        const events = this.store.stream(snap.executionId).filter(e => e.timestamp >= snap.createdAt);
        const start = new Date();
        for (const e of events) {
            for (const h of this._handlers)
                await h(e);
        }
        return {
            executionId: snap.executionId,
            eventsReplayed: events.length,
            startedAt: start,
            completedAt: new Date(),
            fromSnapshot: true,
            snapshotId,
        };
    }
    async dryReplay(events) {
        const eventTypes = {};
        const causalIds = new Set();
        let causalChains = 0;
        let orphanedEvents = 0;
        const allIds = new Set(events.map(e => e.id));
        for (const e of events) {
            eventTypes[e.eventType] = (eventTypes[e.eventType] ?? 0) + 1;
            if (e.causationId) {
                causalIds.add(e.causationId);
                if (allIds.has(e.causationId))
                    causalChains++;
                else
                    orphanedEvents++;
            }
        }
        return {
            eventsProcessed: events.length,
            eventTypes,
            causalChains,
            orphanedEvents,
        };
    }
}
exports.ReplayEngine = ReplayEngine;
//# sourceMappingURL=ReplayEngine.js.map