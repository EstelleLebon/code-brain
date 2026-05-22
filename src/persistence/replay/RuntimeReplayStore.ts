import type Database from 'better-sqlite3';
import type { RuntimeReplayEvent } from '../../runtime-replay/RuntimeReplayEvent.js';

/** Persistent append-only store for RuntimeReplayEvents. */
export class RuntimeReplayStore {
  constructor(private readonly db: Database.Database) {}

  append(event: RuntimeReplayEvent): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO runtime_replay_events (id, operation_id, outcome_id, caused_rollback, payload, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.operationId,
      event.outcomeId ?? null,
      event.causedRollback ? 1 : 0,
      JSON.stringify({ runtimeSignals: event.runtimeSignals, metadata: event.metadata }),
      event.timestamp,
    );
  }

  query(filter: { operationId?: string; causedRollback?: boolean; since?: number } = {}): RuntimeReplayEvent[] {
    let sql = 'SELECT * FROM runtime_replay_events WHERE 1=1';
    const params: (string | number)[] = [];
    if (filter.operationId) { sql += ' AND operation_id = ?'; params.push(filter.operationId); }
    if (filter.causedRollback !== undefined) { sql += ' AND caused_rollback = ?'; params.push(filter.causedRollback ? 1 : 0); }
    if (filter.since !== undefined) { sql += ' AND timestamp >= ?'; params.push(filter.since); }
    sql += ' ORDER BY timestamp ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => {
      const p = JSON.parse(r.payload);
      return {
        id: r.id,
        operationId: r.operation_id,
        outcomeId: r.outcome_id ?? '',
        causedRollback: r.caused_rollback === 1,
        runtimeSignals: p.runtimeSignals ?? [],
        timestamp: r.timestamp,
        metadata: p.metadata,
      };
    });
  }

  byOperation(operationId: string): RuntimeReplayEvent[] {
    return this.query({ operationId });
  }

  rollbacks(): RuntimeReplayEvent[] {
    return this.query({ causedRollback: true });
  }

  clear(): void {
    this.db.prepare('DELETE FROM runtime_replay_events').run();
  }
}
