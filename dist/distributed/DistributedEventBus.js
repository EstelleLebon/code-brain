"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedEventBus = void 0;
class DistributedEventBus {
    log = [];
    subscribers = new Map();
    sequenceCounter = 0;
    causalClocks = new Map();
    partitions = new Map();
    publish(event, sourceNodeId, targetNodeId = 'broadcast') {
        if (targetNodeId !== 'broadcast' && this.isPartitioned(sourceNodeId, targetNodeId)) {
            const dropped = {
                envelopeId: `dropped-${this.sequenceCounter++}`,
                eventType: event.type,
                payload: event,
                sourceNodeId,
                targetNodeId,
                timestamp: this.sequenceCounter,
                sequenceNumber: this.sequenceCounter,
                causalClock: {},
            };
            return dropped;
        }
        const clock = this.advanceClock(sourceNodeId);
        const envelope = {
            envelopeId: `env-${this.sequenceCounter}`,
            eventType: event.type,
            payload: event,
            sourceNodeId,
            targetNodeId,
            timestamp: this.sequenceCounter,
            sequenceNumber: this.sequenceCounter++,
            causalClock: { ...clock },
        };
        this.log.push(envelope);
        this.deliver(envelope);
        return envelope;
    }
    subscribe(eventType, handler) {
        if (!this.subscribers.has(eventType))
            this.subscribers.set(eventType, []);
        this.subscribers.get(eventType).push(handler);
        return () => this.unsubscribe(eventType, handler);
    }
    unsubscribe(eventType, handler) {
        const handlers = this.subscribers.get(eventType);
        if (handlers) {
            const idx = handlers.indexOf(handler);
            if (idx >= 0)
                handlers.splice(idx, 1);
        }
    }
    replay(fromSequence = 0) {
        return this.log.filter(e => e.sequenceNumber >= fromSequence);
    }
    snapshot() {
        return { log: [...this.log], sequenceCounter: this.sequenceCounter };
    }
    addPartition(partitionId, nodeIds) {
        this.partitions.set(partitionId, new Set(nodeIds));
    }
    removePartition(partitionId) {
        this.partitions.delete(partitionId);
    }
    isPartitioned(nodeA, nodeB) {
        for (const isolated of this.partitions.values()) {
            if (isolated.has(nodeA) !== isolated.has(nodeB))
                return true;
        }
        return false;
    }
    deliver(envelope) {
        const handlers = this.subscribers.get(envelope.eventType) || [];
        for (const h of handlers)
            h(envelope);
        const wildcardHandlers = this.subscribers.get('*') || [];
        for (const h of wildcardHandlers)
            h(envelope);
    }
    advanceClock(nodeId) {
        const clock = this.causalClocks.get(nodeId) || {};
        clock[nodeId] = (clock[nodeId] || 0) + 1;
        this.causalClocks.set(nodeId, clock);
        return clock;
    }
    getLog() { return this.log; }
    getSequenceCounter() { return this.sequenceCounter; }
}
exports.DistributedEventBus = DistributedEventBus;
//# sourceMappingURL=DistributedEventBus.js.map