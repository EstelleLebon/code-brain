import { DistributedReplayEvent } from './DistributedReplayEvent';
export declare class DistributedReplayTimeline {
    private eventsByNode;
    constructor(eventsByNode: Map<string, DistributedReplayEvent[]>);
    merge(eventsByNode: Map<string, DistributedReplayEvent[]>): DistributedReplayEvent[];
    detectOrderingConflicts(): Array<{
        eventA: DistributedReplayEvent;
        eventB: DistributedReplayEvent;
        reason: string;
    }>;
    criticalTransitions(): DistributedReplayEvent[];
    rollbackChains(): Map<string, DistributedReplayEvent[]>;
    partitionWindows(): Array<{
        start: DistributedReplayEvent;
        end: DistributedReplayEvent;
        affectedNodes: string[];
    }>;
}
//# sourceMappingURL=DistributedReplayTimeline.d.ts.map