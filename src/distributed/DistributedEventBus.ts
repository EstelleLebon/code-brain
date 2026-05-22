// Deterministic in-memory event bus
export interface EventEnvelope<T = unknown> {
  envelopeId: string;
  eventType: string;
  payload: T;
  sourceNodeId: string;
  targetNodeId: string | 'broadcast';
  timestamp: number;
  sequenceNumber: number;
  causalClock: Record<string, number>;
}

export type DistributedEvent =
  | { type: 'node_joined'; nodeId: string }
  | { type: 'node_left'; nodeId: string }
  | { type: 'goal_assigned'; nodeId: string; goalId: string }
  | { type: 'step_completed'; nodeId: string; stepId: string; result: unknown }
  | { type: 'consensus_proposed'; proposalId: string; topic: string }
  | { type: 'consensus_voted'; proposalId: string; nodeId: string; vote: boolean }
  | { type: 'consensus_resolved'; proposalId: string; outcome: boolean }
  | { type: 'partition_created'; partitionId: string; affectedNodes: string[] }
  | { type: 'partition_healed'; partitionId: string }
  | { type: 'memory_replicated'; sourceNodeId: string; targetNodeId: string; memoryId: string }
  | { type: 'conflict_detected'; memoryId: string; nodeIds: string[] }
  | { type: 'conflict_resolved'; memoryId: string; strategy: string };

export class DistributedEventBus {
  private log: EventEnvelope[] = [];
  private subscribers: Map<string, Array<(env: EventEnvelope) => void>> = new Map();
  private sequenceCounter = 0;
  private causalClocks: Map<string, Record<string, number>> = new Map();
  private partitions: Map<string, Set<string>> = new Map();

  publish(event: DistributedEvent, sourceNodeId: string, targetNodeId: string | 'broadcast' = 'broadcast'): EventEnvelope {
    if (targetNodeId !== 'broadcast' && this.isPartitioned(sourceNodeId, targetNodeId)) {
      const dropped: EventEnvelope = {
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
    const envelope: EventEnvelope = {
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

  subscribe(eventType: string, handler: (env: EventEnvelope) => void): () => void {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, []);
    this.subscribers.get(eventType)!.push(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe(eventType: string, handler: (env: EventEnvelope) => void): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  replay(fromSequence = 0): EventEnvelope[] {
    return this.log.filter(e => e.sequenceNumber >= fromSequence);
  }

  snapshot(): { log: EventEnvelope[]; sequenceCounter: number } {
    return { log: [...this.log], sequenceCounter: this.sequenceCounter };
  }

  addPartition(partitionId: string, nodeIds: string[]): void {
    this.partitions.set(partitionId, new Set(nodeIds));
  }

  removePartition(partitionId: string): void {
    this.partitions.delete(partitionId);
  }

  isPartitioned(nodeA: string, nodeB: string): boolean {
    for (const isolated of this.partitions.values()) {
      if (isolated.has(nodeA) !== isolated.has(nodeB)) return true;
    }
    return false;
  }

  private deliver(envelope: EventEnvelope): void {
    const handlers = this.subscribers.get(envelope.eventType) || [];
    for (const h of handlers) h(envelope);
    const wildcardHandlers = this.subscribers.get('*') || [];
    for (const h of wildcardHandlers) h(envelope);
  }

  private advanceClock(nodeId: string): Record<string, number> {
    const clock = this.causalClocks.get(nodeId) || {};
    clock[nodeId] = (clock[nodeId] || 0) + 1;
    this.causalClocks.set(nodeId, clock);
    return clock;
  }

  getLog(): readonly EventEnvelope[] { return this.log; }
  getSequenceCounter(): number { return this.sequenceCounter; }
}
