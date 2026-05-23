"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryReplication = void 0;
class MemoryReplication {
    bus;
    strategy;
    store = new Map();
    conflicts = [];
    clock = 0;
    constructor(bus, strategy = 'highest_confidence') {
        this.bus = bus;
        this.strategy = strategy;
    }
    replicate(entry, targetNodeId) {
        const existing = this.store.get(entry.memoryId) ?? [];
        const conflict = existing.find(e => e.sourceNodeId !== entry.sourceNodeId && e.version === entry.version);
        if (conflict) {
            this.conflicts.push({
                memoryId: entry.memoryId,
                entries: [conflict, entry],
                detectedAt: this.clock++,
            });
            this.bus.publish({ type: 'conflict_detected', memoryId: entry.memoryId, nodeIds: [conflict.sourceNodeId, entry.sourceNodeId] }, entry.sourceNodeId, targetNodeId);
        }
        existing.push(entry);
        this.store.set(entry.memoryId, existing);
        this.bus.publish({ type: 'memory_replicated', sourceNodeId: entry.sourceNodeId, targetNodeId, memoryId: entry.memoryId }, entry.sourceNodeId, targetNodeId);
    }
    resolve(memoryId) {
        const entries = this.store.get(memoryId);
        if (!entries || entries.length === 0)
            return undefined;
        switch (this.strategy) {
            case 'last_write_wins':
                return entries.reduce((latest, e) => e.timestamp > latest.timestamp ? e : latest);
            case 'highest_confidence':
                return entries.reduce((best, e) => e.confidence > best.confidence ? e : best);
            case 'merge':
                return entries.reduce((latest, e) => e.version > latest.version ? e : latest);
            case 'manual':
                return entries[0];
        }
    }
    getConflicts() { return [...this.conflicts]; }
    getStore() { return new Map(this.store); }
    syncEpisodic(events, sourceNodeId, targetNodeId) {
        const entry = {
            memoryId: `episodic-${sourceNodeId}-${this.clock}`,
            content: events,
            confidence: 1.0,
            sourceNodeId,
            version: this.clock++,
            timestamp: this.clock,
        };
        this.replicate(entry, targetNodeId);
    }
}
exports.MemoryReplication = MemoryReplication;
//# sourceMappingURL=MemoryReplication.js.map