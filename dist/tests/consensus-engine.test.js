"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedEventBus_js_1 = require("../distributed/DistributedEventBus.js");
const ConsensusEngine_js_1 = require("../distributed-planning/ConsensusEngine.js");
function makeBus() { return new DistributedEventBus_js_1.DistributedEventBus(); }
function makeProposal(overrides = {}) {
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
(0, node_test_1.describe)('ConsensusEngine', () => {
    (0, node_test_1.it)('propose stores proposal', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal());
        strict_1.default.ok(engine.getProposal('p1'));
    });
    (0, node_test_1.it)('propose publishes consensus_proposed event', () => {
        const bus = makeBus();
        const events = [];
        bus.subscribe('consensus_proposed', () => events.push('proposed'));
        const engine = new ConsensusEngine_js_1.ConsensusEngine(bus);
        engine.propose(makeProposal());
        strict_1.default.equal(events.length, 1);
    });
    (0, node_test_1.it)('unanimous mode: all yes = true', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', true);
        strict_1.default.equal(engine.resolve('p1')?.outcome, true);
    });
    (0, node_test_1.it)('unanimous mode: one no = false', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, false);
    });
    (0, node_test_1.it)('majority mode: 2/3 yes = true', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'majority', voters: ['n1', 'n2', 'n3'] }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', true);
        engine.vote('p1', 'n3', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, true);
    });
    (0, node_test_1.it)('majority mode: 1/3 yes = false', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'majority', voters: ['n1', 'n2', 'n3'] }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', false);
        engine.vote('p1', 'n3', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, false);
    });
    (0, node_test_1.it)('weighted mode: higher weight wins', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({
            mode: 'weighted',
            voters: ['n1', 'n2'],
            weights: { n1: 10, n2: 1 },
        }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, true);
    });
    (0, node_test_1.it)('weighted mode: lower weighted voter loses', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({
            mode: 'weighted',
            voters: ['n1', 'n2'],
            weights: { n1: 1, n2: 10 },
        }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, false);
    });
    (0, node_test_1.it)('leader mode: leader vote decides', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'leader', voters: ['n1', 'n2'], leaderId: 'n1' }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n2', false);
        strict_1.default.equal(engine.resolve('p1')?.outcome, true);
    });
    (0, node_test_1.it)('leader mode: leader no overrides others', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'leader', voters: ['n1', 'n2'], leaderId: 'n1' }));
        engine.vote('p1', 'n1', false);
        engine.vote('p1', 'n2', true);
        strict_1.default.equal(engine.resolve('p1')?.outcome, false);
    });
    (0, node_test_1.it)('abort stops resolution', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ voters: ['n1'] }));
        engine.abort('p1');
        strict_1.default.equal(engine.resolve('p1')?.outcome, false);
        strict_1.default.equal(engine.resolve('p1')?.reason, 'aborted');
    });
    (0, node_test_1.it)('forceResolve resolves pending proposal', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ voters: ['n1', 'n2'] }));
        engine.vote('p1', 'n1', true);
        // n2 hasn't voted — forceResolve aborts
        const result = engine.forceResolve('p1');
        strict_1.default.ok(result !== undefined);
    });
    (0, node_test_1.it)('duplicate votes are ignored', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        engine.propose(makeProposal({ mode: 'unanimous', voters: ['n1', 'n2'] }));
        engine.vote('p1', 'n1', true);
        engine.vote('p1', 'n1', false); // duplicate — should be ignored
        engine.vote('p1', 'n2', true);
        strict_1.default.equal(engine.resolve('p1')?.outcome, true);
    });
    (0, node_test_1.it)('resolve returns undefined for unknown proposal', () => {
        const engine = new ConsensusEngine_js_1.ConsensusEngine(makeBus());
        strict_1.default.equal(engine.resolve('unknown'), undefined);
    });
});
//# sourceMappingURL=consensus-engine.test.js.map