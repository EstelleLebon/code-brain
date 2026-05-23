import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';
export type ConsensusMode = 'unanimous' | 'majority' | 'weighted' | 'leader';
export interface ConsensusProposal {
    proposalId: string;
    topic: string;
    proposedBy: string;
    mode: ConsensusMode;
    voters: string[];
    weights?: Record<string, number>;
    leaderId?: string;
    deadline: number;
    data: unknown;
}
export interface ConsensusVote {
    proposalId: string;
    nodeId: string;
    vote: boolean;
    weight: number;
    timestamp: number;
}
export interface ConsensusResult {
    proposalId: string;
    outcome: boolean;
    votes: ConsensusVote[];
    resolvedAt: number;
    reason: string;
}
export declare class ConsensusEngine {
    private bus;
    private proposals;
    private votes;
    private results;
    private clock;
    constructor(bus: DistributedEventBus);
    propose(proposal: ConsensusProposal): void;
    vote(proposalId: string, nodeId: string, vote: boolean): void;
    private tryResolve;
    resolve(proposalId: string): ConsensusResult | undefined;
    abort(proposalId: string): void;
    getProposal(proposalId: string): ConsensusProposal | undefined;
    forceResolve(proposalId: string): ConsensusResult | undefined;
}
//# sourceMappingURL=ConsensusEngine.d.ts.map