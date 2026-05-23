export interface DistributedReplayEvent {
    eventId: string;
    nodeId: string;
    executionId: string;
    causationId?: string;
    correlationId?: string;
    timestamp: number;
    logicalClock: number;
    eventType: string;
    payload: Record<string, unknown>;
    orderingKey: string;
}
//# sourceMappingURL=DistributedReplayEvent.d.ts.map