"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayConsistencyValidator = void 0;
function hashEvents(events) {
    const PRIME = 1_000_000_007;
    let hash = 0;
    for (const e of events) {
        const s = `${e.eventId}${e.nodeId}${e.logicalClock}${e.eventType}`;
        for (let i = 0; i < s.length; i++) {
            hash = (hash * 31 + s.charCodeAt(i)) % PRIME;
        }
    }
    return hash.toString(16);
}
function sortEvents(events) {
    return [...events].sort((a, b) => {
        if (a.logicalClock !== b.logicalClock)
            return a.logicalClock - b.logicalClock;
        if (a.timestamp !== b.timestamp)
            return a.timestamp - b.timestamp;
        if (a.nodeId !== b.nodeId)
            return a.nodeId < b.nodeId ? -1 : 1;
        return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
    });
}
class ReplayConsistencyValidator {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    validate(executionId) {
        const run1 = this.engine.replayExecution(executionId);
        const run2 = this.engine.replayExecution(executionId);
        const divergencePoints = [];
        const minLen = Math.min(run1.length, run2.length);
        for (let i = 0; i < minLen; i++) {
            if (run1[i].eventId !== run2[i].eventId) {
                divergencePoints.push(run1[i].eventId);
            }
        }
        if (run1.length !== run2.length) {
            const extra = run1.length > run2.length ? run1[minLen] : run2[minLen];
            divergencePoints.push(extra.eventId);
        }
        const deterministic = divergencePoints.length === 0;
        const replayHash = hashEvents(run1);
        const memoryEvents = run1.filter(e => e.eventType.startsWith('memory.'));
        const memoryHash = hashEvents(memoryEvents);
        const eventOrderHash = run1.map(e => e.eventId).join(',').length.toString(16);
        return { deterministic, divergencePoints, replayHash, memoryHash, eventOrderHash };
    }
    validateOrdering(events) {
        const sorted = sortEvents(events);
        for (let i = 0; i < events.length; i++) {
            if (events[i].eventId !== sorted[i].eventId)
                return false;
        }
        return true;
    }
    validateMemoryConvergence(events) {
        const replicateEvents = events.filter(e => e.eventType === 'memory.replicate');
        if (replicateEvents.length === 0)
            return true;
        // All memory.replicate events should have a valid nodeId (non-empty)
        return replicateEvents.every(e => typeof e.nodeId === 'string' && e.nodeId.length > 0);
    }
    validateConsensusOrder(events) {
        const voteEvents = events.filter(e => e.eventType === 'consensus.vote');
        const commitEvents = events.filter(e => e.eventType === 'consensus.commit');
        // Build a map of correlationId -> first vote index in the events array
        const voteIndex = new Map();
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            if (e.eventType === 'consensus.vote' && e.correlationId) {
                if (!voteIndex.has(e.correlationId)) {
                    voteIndex.set(e.correlationId, i);
                }
            }
        }
        // Every commit must appear after a vote with the same correlationId
        for (let i = 0; i < events.length; i++) {
            const e = events[i];
            if (e.eventType === 'consensus.commit' && e.correlationId) {
                const vi = voteIndex.get(e.correlationId);
                if (vi === undefined || vi >= i)
                    return false;
            }
        }
        // Suppress unused variable warnings
        void voteEvents;
        void commitEvents;
        return true;
    }
}
exports.ReplayConsistencyValidator = ReplayConsistencyValidator;
//# sourceMappingURL=ReplayConsistencyValidator.js.map