import { DistributedReplayEvent } from './DistributedReplayEvent';
export declare class CrossNodeReplayEngine {
    private timeline;
    private allEvents;
    readonly seed: number;
    constructor(eventsByNode: Map<string, DistributedReplayEvent[]>, seed?: number);
    replayExecution(executionId: string): DistributedReplayEvent[];
    replayNode(nodeId: string): DistributedReplayEvent[];
    replayPartition(partitionId: string): DistributedReplayEvent[];
    dryReplay(): {
        eventCount: number;
        nodeCount: number;
        conflictCount: number;
        timelineHash: string;
    };
    replayFromSnapshot(snapshotId: string): DistributedReplayEvent[];
    replayUntil(eventId: string): DistributedReplayEvent[];
    compareReplay(a: string, b: string): {
        match: boolean;
        divergencePoint?: string;
        aCount: number;
        bCount: number;
    };
}
//# sourceMappingURL=CrossNodeReplayEngine.d.ts.map