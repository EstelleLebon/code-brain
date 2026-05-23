import { DistributedReplayEvent } from './DistributedReplayEvent';
import { CrossNodeReplayEngine } from './CrossNodeReplayEngine';
export declare class ReplayConsistencyValidator {
    private engine;
    constructor(engine: CrossNodeReplayEngine);
    validate(executionId: string): {
        deterministic: boolean;
        divergencePoints: string[];
        replayHash: string;
        memoryHash: string;
        eventOrderHash: string;
    };
    validateOrdering(events: DistributedReplayEvent[]): boolean;
    validateMemoryConvergence(events: DistributedReplayEvent[]): boolean;
    validateConsensusOrder(events: DistributedReplayEvent[]): boolean;
}
//# sourceMappingURL=ReplayConsistencyValidator.d.ts.map