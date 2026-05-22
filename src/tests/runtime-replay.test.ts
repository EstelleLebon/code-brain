import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeReplayLog } from '../runtime-replay/RuntimeReplayLog.js';
import { CausalityGraphBuilder } from '../runtime-replay/CausalityGraph.js';

describe('RuntimeReplayLog', () => {
  it('records and retrieves events', () => {
    const log = new RuntimeReplayLog();
    log.record('op-1', ['sig-a', 'sig-b'], 'outcome-1', false);
    assert.equal(log.all().length, 1);
  });

  it('query by operationId', () => {
    const log = new RuntimeReplayLog();
    log.record('op-1', [], 'outcome-1', false);
    log.record('op-2', [], 'outcome-2', true);
    assert.equal(log.forOperation('op-1').length, 1);
    assert.equal(log.forOperation('op-2').length, 1);
  });

  it('rollbacks returns only rollback events', () => {
    const log = new RuntimeReplayLog();
    log.record('op-1', [], 'o1', true);
    log.record('op-2', [], 'o2', false);
    assert.equal(log.rollbacks().length, 1);
  });

  it('clear empties the log', () => {
    const log = new RuntimeReplayLog();
    log.record('op-1', [], 'o1', false);
    log.clear();
    assert.equal(log.all().length, 0);
  });
});

describe('CausalityGraphBuilder', () => {
  it('addEdge registers nodes and edges', () => {
    const g = new CausalityGraphBuilder();
    g.addEdge('op-1', 'outcome-1', 'caused').addEdge('outcome-1', 'rollback-1', 'triggered');
    const graph = g.build();
    assert.ok(graph.nodes.includes('op-1'));
    assert.ok(graph.nodes.includes('outcome-1'));
    assert.equal(graph.edges.length, 2);
  });

  it('ancestors traversal', () => {
    const g = new CausalityGraphBuilder();
    g.addEdge('op-1', 'op-2', 'before').addEdge('op-2', 'op-3', 'before');
    const ancestors = g.ancestors('op-3');
    assert.ok(ancestors.includes('op-2'));
    assert.ok(ancestors.includes('op-1'));
  });

  it('descendants traversal', () => {
    const g = new CausalityGraphBuilder();
    g.addEdge('root', 'child-a', 'caused').addEdge('root', 'child-b', 'caused');
    const desc = g.descendants('root');
    assert.ok(desc.includes('child-a'));
    assert.ok(desc.includes('child-b'));
  });
});
