import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DependencyGraph } from '../graph/dependency-graph.js';
import { DependencyEdge } from '../types/index.js';

describe('DependencyGraph', () => {
  test('addEdge and getDependencies', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'A', toId: 'C', kind: 'call' });

    const deps = g.getDependencies('A', 1);
    assert.ok(deps.includes('B'), 'A should depend on B');
    assert.ok(deps.includes('C'), 'A should depend on C');
    assert.equal(deps.length, 2);
  });

  test('getDependents (reverse edges)', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });
    g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });

    const dependents = g.getDependents('C', 1);
    assert.ok(dependents.includes('A'), 'C should have A as dependent');
    assert.ok(dependents.includes('B'), 'C should have B as dependent');
    assert.equal(dependents.length, 2);
  });

  test('deep dependency traversal', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
    g.addEdge({ fromId: 'C', toId: 'D', kind: 'import' });

    const deps = g.getDependencies('A', 3);
    assert.ok(deps.includes('B'));
    assert.ok(deps.includes('C'));
  });

  test('detects circular dependency', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
    g.addEdge({ fromId: 'C', toId: 'A', kind: 'import' });

    assert.equal(g.hasCircularDependency('A'), true);
  });

  test('no circular dependency in DAG', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'B', toId: 'C', kind: 'import' });
    g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });

    assert.equal(g.hasCircularDependency('A'), false);
  });

  test('detectCycles returns cycles', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'X', toId: 'Y', kind: 'import' });
    g.addEdge({ fromId: 'Y', toId: 'X', kind: 'import' });

    const cycles = g.detectCycles();
    assert.ok(cycles.length > 0, 'Should detect at least one cycle');
  });

  test('removeEdgesFrom clears outgoing edges', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'A', toId: 'C', kind: 'import' });
    g.removeEdgesFrom('A');

    assert.equal(g.getDependencies('A', 1).length, 0);
  });

  test('fromEdges static constructor', () => {
    const edges: DependencyEdge[] = [
      { fromId: 'P', toId: 'Q', kind: 'import' },
      { fromId: 'Q', toId: 'R', kind: 'call' },
    ];
    const g = DependencyGraph.fromEdges(edges);
    assert.ok(g.getDependencies('P', 1).includes('Q'));
    assert.ok(g.getDependencies('Q', 1).includes('R'));
  });

  test('getAllEdges returns all edges', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.addEdge({ fromId: 'B', toId: 'C', kind: 'extends' });

    const all = g.getAllEdges();
    assert.equal(all.length, 2);
  });

  test('edge kind is preserved', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'extends' });
    const kind = g.getEdgeKind('A', 'B');
    assert.equal(kind, 'extends');
  });

  test('clear removes all data', () => {
    const g = new DependencyGraph();
    g.addEdge({ fromId: 'A', toId: 'B', kind: 'import' });
    g.clear();
    assert.equal(g.getEdgeCount(), 0);
    assert.equal(g.getDependencies('A', 1).length, 0);
  });
});
