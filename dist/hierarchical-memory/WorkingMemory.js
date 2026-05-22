"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
/**
 * Short-lived session memory. Holds in-progress context for the current execution session.
 * TTL-based eviction; not persisted to disk.
 */
class WorkingMemory {
    sessionId;
    activeChunkIds = new Set();
    recentSignals = [];
    recentOutcomes = [];
    pendingMutationCount = 0;
    ttlMs;
    maxSignals;
    maxOutcomes;
    lastActivity = Date.now();
    constructor(sessionId, ttlMs = 30 * 60 * 1000, maxSignals = 50, maxOutcomes = 20) {
        this.sessionId = sessionId;
        this.ttlMs = ttlMs;
        this.maxSignals = maxSignals;
        this.maxOutcomes = maxOutcomes;
    }
    setActiveChunks(chunkIds) {
        this.activeChunkIds = new Set(chunkIds);
        this.touch();
    }
    addSignal(signal) {
        this.recentSignals.push(signal);
        if (this.recentSignals.length > this.maxSignals)
            this.recentSignals.shift();
        this.touch();
    }
    addOutcome(outcome) {
        this.recentOutcomes.push(outcome);
        if (this.recentOutcomes.length > this.maxOutcomes)
            this.recentOutcomes.shift();
        this.touch();
    }
    setPendingMutations(count) {
        this.pendingMutationCount = count;
        this.touch();
    }
    isExpired() {
        return Date.now() - this.lastActivity >= this.ttlMs;
    }
    snapshot() {
        return {
            sessionId: this.sessionId,
            activeChunkIds: [...this.activeChunkIds],
            recentSignals: [...this.recentSignals],
            recentOutcomes: [...this.recentOutcomes],
            pendingMutationCount: this.pendingMutationCount,
            capturedAt: Date.now(),
        };
    }
    clear() {
        this.activeChunkIds.clear();
        this.recentSignals = [];
        this.recentOutcomes = [];
        this.pendingMutationCount = 0;
    }
    touch() {
        this.lastActivity = Date.now();
    }
}
exports.WorkingMemory = WorkingMemory;
//# sourceMappingURL=WorkingMemory.js.map