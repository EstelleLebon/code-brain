import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SemanticReplayLog } from '../semantic-replay/SemanticReplayLog.js';

describe('SemanticReplayLog', () => {
  it('records and retrieves events', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: ['a.ts'], status: 'applied' });
    assert.equal(log.size, 1);
  });

  it('filters by operationType', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    log.record({ operationId: 'op2', operationType: 'move_function', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    const results = log.query({ operationType: 'rename_symbol' });
    assert.equal(results.length, 1);
    assert.equal(results[0]!.operationType, 'rename_symbol');
  });

  it('filters by status', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    log.record({ operationId: 'op2', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'failed' });
    assert.equal(log.query({ status: 'applied' }).length, 1);
    assert.equal(log.query({ status: 'failed' }).length, 1);
  });

  it('canReplay returns true when all events applied', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    assert.equal(log.canReplay('xfm1'), true);
  });

  it('canReplay returns false when any event failed', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    log.record({ operationId: 'op2', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'failed' });
    assert.equal(log.canReplay('xfm1'), false);
  });

  it('clear resets the log', () => {
    const log = new SemanticReplayLog();
    log.record({ operationId: 'op1', operationType: 'rename_symbol', transformationId: 'xfm1', affectedArtifacts: [], status: 'applied' });
    log.clear();
    assert.equal(log.size, 0);
  });
});
