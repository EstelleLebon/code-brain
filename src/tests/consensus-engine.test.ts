import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DistributedEventBus } from '../distributed/DistributedEventBus.js';
import { ConsensusEngine } from '../distributed-planning/ConsensusEngine.js';
import type { ConsensusProposal } from '../distributed-planning/ConsensusEngine.js';

function makeBus() { return new DistributedEventBus(); }

function makeProposal(overrides: Partial<ConsensusProposal> = {}): ConsensusProposal {
  return {
    proposalId: 'p1',
    topic: 'test',
    proposedBy: 'n0',
    mode: 'majority',
    voters: ['n1', 'n2', 'n3'],
    deadline: 100,
    data: {},
    ...overrides,
  };
}

describe('ConsensusEngine', () => {
  it('propose stores proposal', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal());
    assert.ok(engine.getProposal('p1'));
  });

  it('propose publishes consensus_proposed event', () => {
    const bus = makeBus();
    const events: string[] = [];
    bus.subscribe('consensus_proposed', () => events.push('proposed'));
    const engine = new ConsensusEngine(bus);
    engine.propose(makeProposal());
    assert.equal(events.length, 1);
  });

  it('unanimous mode: all yes = true', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', true);
    assert.equal(engine.resolve('p1')?.outcome, true);
  });

  it('unanimous mode: one no = false', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', false);
    assert.equal(engine.resolve('p1')?.outcome, false);
  });

  it('majority mode: 2/3 yes = true', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'majority', voters: ['n1', 'n2', 'n3'] }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', true);
    engine.vote('p1', 'n3', false);
    assert.equal(engine.resolve('p1')?.outcome, true);
  });

  it('majority mode: 1/3 yes = false', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'majority', voters: ['n1', 'n2', 'n3'] }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', false);
    engine.vote('p1', 'n3', false);
    assert.equal(engine.resolve('p1')?.outcome, false);
  });

  it('weighted mode: higher weight wins', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({
      mode: 'weighted',
      voters: ['n1', 'n2'],
      weights: { n1: 10, n2: 1 },
    }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', false);
    assert.equal(engine.resolve('p1')?.outcome, true);
  });

  it('weighted mode: lower weighted voter loses', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({
      mode: 'weighted',
      voters: ['n1', 'n2'],
      weights: { n1: 1, n2: 10 },
    }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', false);
    assert.equal(engine.resolve('p1')?.outcome, false);
  });

  it('leader mode: leader vote decides', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'leader', voters: ['n1', 'n2'], leaderId: 'n1' }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n2', false);
    assert.equal(engine.resolve('p1')?.outcome, true);
  });

  it('leader mode: leader no overrides others', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'leader', voters: ['n1', 'n2'], leaderId: 'n1' }));
    engine.vote('p1', 'n1', false);
    engine.vote('p1', 'n2', true);
    assert.equal(engine.resolve('p1')?.outcome, false);
  });

  it('abort stops resolution', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ voters: ['n1'] }));
    engine.abort('p1');
    assert.equal(engine.resolve('p1')?.outcome, false);
    assert.equal(engine.resolve('p1')?.reason, 'aborted');
  });

  it('forceResolve resolves pending proposal', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ voters: ['n1', 'n2'] }));
    engine.vote('p1', 'n1', true);
    // n2 hasn't voted — forceResolve aborts
    const result = engine.forceResolve('p1');
    assert.ok(result !== undefined);
  });

  it('duplicate votes are ignored', () => {
    const engine = new ConsensusEngine(makeBus());
    engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
    engine.vote('p1', 'n1', true);
    engine.vote('p1', 'n1', false); // duplicate — should be ignored
    engine.vote('p1', 'n2', true);
    assert.equal(engine.resolve('p1')?.outcome, true);
  });

  it('resolve returns undefined for unknown proposal', () => {
    const engine = new ConsensusEngine(makeBus());
    assert.equal(engine.resolve('unknown'), undefined);
  });
});
