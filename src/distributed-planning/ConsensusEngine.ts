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

export class ConsensusEngine {
  private proposals: Map<string, ConsensusProposal> = new Map();
  private votes: Map<string, ConsensusVote[]> = new Map();
  private results: Map<string, ConsensusResult> = new Map();
  private clock = 0;

  constructor(private bus: DistributedEventBus) {}

  propose(proposal: ConsensusProposal): void {
    this.proposals.set(proposal.proposalId, proposal);
    this.votes.set(proposal.proposalId, []);
    this.bus.publish(
      { type: 'consensus_proposed', proposalId: proposal.proposalId, topic: proposal.topic },
      proposal.proposedBy
    );
  }

  vote(proposalId: string, nodeId: string, vote: boolean): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Unknown proposal: ${proposalId}`);
    if (this.results.has(proposalId)) return;

    const weight = proposal.weights?.[nodeId] ?? 1;
    const votes = this.votes.get(proposalId)!;

    if (votes.some(v => v.nodeId === nodeId)) return;

    votes.push({ proposalId, nodeId, vote, weight, timestamp: this.clock++ });
    this.bus.publish({ type: 'consensus_voted', proposalId, nodeId, vote }, nodeId);

    this.tryResolve(proposal);
  }

  private tryResolve(proposal: ConsensusProposal): void {
    const votes = this.votes.get(proposal.proposalId)!;
    const hasAllVoted = proposal.voters.every(v => votes.some(vote => vote.nodeId === v));
    if (!hasAllVoted) return;

    let outcome = false;
    let reason = '';

    switch (proposal.mode) {
      case 'unanimous':
        outcome = votes.every(v => v.vote);
        reason = outcome ? 'unanimous approval' : 'rejected by unanimous requirement';
        break;
      case 'majority': {
        const yeas = votes.filter(v => v.vote).length;
        outcome = yeas > votes.length / 2;
        reason = `majority: ${yeas}/${votes.length}`;
        break;
      }
      case 'weighted': {
        const totalWeight = votes.reduce((s, v) => s + v.weight, 0);
        const yesWeight = votes.filter(v => v.vote).reduce((s, v) => s + v.weight, 0);
        outcome = yesWeight > totalWeight / 2;
        reason = `weighted: ${yesWeight}/${totalWeight}`;
        break;
      }
      case 'leader': {
        const leaderVote = votes.find(v => v.nodeId === proposal.leaderId);
        outcome = leaderVote?.vote ?? false;
        reason = `leader decision: ${proposal.leaderId}`;
        break;
      }
    }

    const result: ConsensusResult = {
      proposalId: proposal.proposalId,
      outcome,
      votes: [...votes],
      resolvedAt: this.clock++,
      reason,
    };
    this.results.set(proposal.proposalId, result);
    this.bus.publish({ type: 'consensus_resolved', proposalId: proposal.proposalId, outcome }, 'consensus-engine');
  }

  resolve(proposalId: string): ConsensusResult | undefined {
    return this.results.get(proposalId);
  }

  abort(proposalId: string): void {
    if (this.results.has(proposalId)) return;
    const result: ConsensusResult = {
      proposalId,
      outcome: false,
      votes: this.votes.get(proposalId) ?? [],
      resolvedAt: this.clock++,
      reason: 'aborted',
    };
    this.results.set(proposalId, result);
  }

  getProposal(proposalId: string): ConsensusProposal | undefined {
    return this.proposals.get(proposalId);
  }

  forceResolve(proposalId: string): ConsensusResult | undefined {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || this.results.has(proposalId)) return this.results.get(proposalId);
    this.tryResolve(proposal);
    if (!this.results.has(proposalId)) this.abort(proposalId);
    return this.results.get(proposalId);
  }
}
