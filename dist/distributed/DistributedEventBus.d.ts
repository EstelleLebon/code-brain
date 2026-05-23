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
export type DistributedEvent = {
    type: 'node_joined';
    nodeId: string;
} | {
    type: 'node_left';
    nodeId: string;
} | {
    type: 'goal_assigned';
    nodeId: string;
    goalId: string;
} | {
    type: 'step_completed';
    nodeId: string;
    stepId: string;
    result: unknown;
} | {
    type: 'consensus_proposed';
    proposalId: string;
    topic: string;
} | {
    type: 'consensus_voted';
    proposalId: string;
    nodeId: string;
    vote: boolean;
} | {
    type: 'consensus_resolved';
    proposalId: string;
    outcome: boolean;
} | {
    type: 'partition_created';
    partitionId: string;
    affectedNodes: string[];
} | {
    type: 'partition_healed';
    partitionId: string;
} | {
    type: 'memory_replicated';
    sourceNodeId: string;
    targetNodeId: string;
    memoryId: string;
} | {
    type: 'conflict_detected';
    memoryId: string;
    nodeIds: string[];
} | {
    type: 'conflict_resolved';
    memoryId: string;
    strategy: string;
};
export declare class DistributedEventBus {
    private log;
    private subscribers;
    private sequenceCounter;
    private causalClocks;
    private partitions;
    publish(event: DistributedEvent, sourceNodeId: string, targetNodeId?: string | 'broadcast'): EventEnvelope;
    subscribe(eventType: string, handler: (env: EventEnvelope) => void): () => void;
    unsubscribe(eventType: string, handler: (env: EventEnvelope) => void): void;
    replay(fromSequence?: number): EventEnvelope[];
    snapshot(): {
        log: EventEnvelope[];
        sequenceCounter: number;
    };
    addPartition(partitionId: string, nodeIds: string[]): void;
    removePartition(partitionId: string): void;
    isPartitioned(nodeA: string, nodeB: string): boolean;
    private deliver;
    private advanceClock;
    getLog(): readonly EventEnvelope[];
    getSequenceCounter(): number;
}
//# sourceMappingURL=DistributedEventBus.d.ts.map