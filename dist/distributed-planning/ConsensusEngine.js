"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusEngine = void 0;
class ConsensusEngine {
    bus;
    proposals = new Map();
    votes = new Map();
    results = new Map();
    clock = 0;
    constructor(bus) {
        this.bus = bus;
    }
    propose(proposal) {
        this.proposals.set(proposal.proposalId, proposal);
        this.votes.set(proposal.proposalId, []);
        this.bus.publish({ type: 'consensus_proposed', proposalId: proposal.proposalId, topic: proposal.topic }, proposal.proposedBy);
    }
    vote(proposalId, nodeId, vote) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            throw new Error(`Unknown proposal: ${proposalId}`);
        if (this.results.has(proposalId))
            return;
        const weight = proposal.weights?.[nodeId] ?? 1;
        const votes = this.votes.get(proposalId);
        if (votes.some(v => v.nodeId === nodeId))
            return;
        votes.push({ proposalId, nodeId, vote, weight, timestamp: this.clock++ });
        this.bus.publish({ type: 'consensus_voted', proposalId, nodeId, vote }, nodeId);
        this.tryResolve(proposal);
    }
    tryResolve(proposal) {
        const votes = this.votes.get(proposal.proposalId);
        const hasAllVoted = proposal.voters.every(v => votes.some(vote => vote.nodeId === v));
        if (!hasAllVoted)
            return;
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
        const result = {
            proposalId: proposal.proposalId,
            outcome,
            votes: [...votes],
            resolvedAt: this.clock++,
            reason,
        };
        this.results.set(proposal.proposalId, result);
        this.bus.publish({ type: 'consensus_resolved', proposalId: proposal.proposalId, outcome }, 'consensus-engine');
    }
    resolve(proposalId) {
        return this.results.get(proposalId);
    }
    abort(proposalId) {
        if (this.results.has(proposalId))
            return;
        const result = {
            proposalId,
            outcome: false,
            votes: this.votes.get(proposalId) ?? [],
            resolvedAt: this.clock++,
            reason: 'aborted',
        };
        this.results.set(proposalId, result);
    }
    getProposal(proposalId) {
        return this.proposals.get(proposalId);
    }
    forceResolve(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal || this.results.has(proposalId))
            return this.results.get(proposalId);
        this.tryResolve(proposal);
        if (!this.results.has(proposalId))
            this.abort(proposalId);
        return this.results.get(proposalId);
    }
}
exports.ConsensusEngine = ConsensusEngine;
//# sourceMappingURL=ConsensusEngine.js.map