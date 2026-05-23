"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossNodeReplayEngine = void 0;
const DistributedReplayTimeline_1 = require("./DistributedReplayTimeline");
function deterministicHash(events) {
    const str = events.map(e => `${e.eventId}:${e.nodeId}:${e.logicalClock}`).join('|');
    const PRIME = 1_000_000_007;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) % PRIME;
    }
    return hash.toString(16);
}
class CrossNodeReplayEngine {
    timeline;
    allEvents;
    seed;
    constructor(eventsByNode, seed = 42) {
        this.seed = seed;
        this.timeline = new DistributedReplayTimeline_1.DistributedReplayTimeline(eventsByNode);
        this.allEvents = this.timeline.merge(eventsByNode);
    }
    replayExecution(executionId) {
        return this.allEvents.filter(e => e.executionId === executionId);
    }
    replayNode(nodeId) {
        return this.allEvents.filter(e => e.nodeId === nodeId);
    }
    replayPartition(partitionId) {
        return this.allEvents.filter(e => e.payload['partitionId'] === partitionId);
    }
    dryReplay() {
        const nodeIds = new Set(this.allEvents.map(e => e.nodeId));
        const conflicts = this.timeline.detectOrderingConflicts();
        return {
            eventCount: this.allEvents.length,
            nodeCount: nodeIds.size,
            conflictCount: conflicts.length,
            timelineHash: deterministicHash(this.allEvents),
        };
    }
    replayFromSnapshot(snapshotId) {
        return this.allEvents.filter(e => e.eventId >= snapshotId);
    }
    replayUntil(eventId) {
        const idx = this.allEvents.findIndex(e => e.eventId === eventId);
        if (idx < 0)
            return [...this.allEvents];
        return this.allEvents.slice(0, idx);
    }
    compareReplay(a, b) {
        const aEvents = this.replayExecution(a);
        const bEvents = this.replayExecution(b);
        const minLen = Math.min(aEvents.length, bEvents.length);
        for (let i = 0; i < minLen; i++) {
            if (aEvents[i].eventType !== bEvents[i].eventType || aEvents[i].orderingKey !== bEvents[i].orderingKey) {
                return { match: false, divergencePoint: aEvents[i].eventId, aCount: aEvents.length, bCount: bEvents.length };
            }
        }
        const match = aEvents.length === bEvents.length;
        return {
            match,
            divergencePoint: match ? undefined : (aEvents[minLen] ?? bEvents[minLen])?.eventId,
            aCount: aEvents.length,
            bCount: bEvents.length,
        };
    }
}
exports.CrossNodeReplayEngine = CrossNodeReplayEngine;
//# sourceMappingURL=CrossNodeReplayEngine.js.map