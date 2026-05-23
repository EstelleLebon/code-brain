"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedReplayTimeline = void 0;
class DistributedReplayTimeline {
    eventsByNode;
    constructor(eventsByNode) {
        this.eventsByNode = eventsByNode;
    }
    merge(eventsByNode) {
        const all = [];
        for (const events of eventsByNode.values()) {
            all.push(...events);
        }
        return all.sort((a, b) => {
            if (a.logicalClock !== b.logicalClock)
                return a.logicalClock - b.logicalClock;
            if (a.timestamp !== b.timestamp)
                return a.timestamp - b.timestamp;
            if (a.nodeId !== b.nodeId)
                return a.nodeId < b.nodeId ? -1 : 1;
            return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
        });
    }
    detectOrderingConflicts() {
        const merged = this.merge(this.eventsByNode);
        const conflicts = [];
        for (let i = 0; i < merged.length; i++) {
            for (let j = i + 1; j < merged.length; j++) {
                const a = merged[i];
                const b = merged[j];
                if (a.nodeId === b.nodeId)
                    continue;
                if (a.logicalClock === b.logicalClock) {
                    // Same logical clock but different nodes — potential causal conflict
                    if (a.causationId && b.causationId && a.causationId === b.causationId) {
                        conflicts.push({
                            eventA: a,
                            eventB: b,
                            reason: `Same logicalClock=${a.logicalClock} and same causationId=${a.causationId} on different nodes`,
                        });
                    }
                    else if (!a.causationId && !b.causationId) {
                        conflicts.push({
                            eventA: a,
                            eventB: b,
                            reason: `Concurrent events with same logicalClock=${a.logicalClock} from nodes ${a.nodeId} and ${b.nodeId}`,
                        });
                    }
                }
                // Stop inner scan once logical clocks diverge
                if (b.logicalClock > a.logicalClock)
                    break;
            }
        }
        return conflicts;
    }
    criticalTransitions() {
        const merged = this.merge(this.eventsByNode);
        return merged.filter(e => e.eventType.startsWith('consensus.') ||
            e.eventType.startsWith('partition.') ||
            e.eventType.startsWith('recovery.'));
    }
    rollbackChains() {
        const merged = this.merge(this.eventsByNode);
        const chains = new Map();
        for (const event of merged) {
            if (!event.eventType.includes('rollback'))
                continue;
            const key = event.correlationId ?? event.eventId;
            if (!chains.has(key))
                chains.set(key, []);
            chains.get(key).push(event);
        }
        return chains;
    }
    partitionWindows() {
        const merged = this.merge(this.eventsByNode);
        const windows = [];
        const openPartitions = new Map();
        for (const event of merged) {
            if (event.eventType === 'partition.start' || event.eventType === 'partition.created') {
                const partitionId = event.payload['partitionId'] ?? event.eventId;
                openPartitions.set(partitionId, event);
            }
            else if (event.eventType === 'partition.end' || event.eventType === 'partition.healed') {
                const partitionId = event.payload['partitionId'] ?? '';
                const start = openPartitions.get(partitionId);
                if (start) {
                    const affectedNodes = start.payload['affectedNodes'] ?? [start.nodeId];
                    windows.push({ start, end: event, affectedNodes });
                    openPartitions.delete(partitionId);
                }
            }
        }
        return windows;
    }
}
exports.DistributedReplayTimeline = DistributedReplayTimeline;
//# sourceMappingURL=DistributedReplayTimeline.js.map