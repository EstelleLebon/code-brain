import type Database from 'better-sqlite3';

export interface SemanticReplayRecord {
  id: string;
  operationId: string;
  transformationType: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

/** Persistent append-only store for semantic transformation replay events. */
export class SemanticReplayStore {
  constructor(private readonly db: Database.Database) {}

  append(record: SemanticReplayRecord): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO semantic_replay_events (id, operation_id, transformation_type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(record.id, record.operationId, record.transformationType, JSON.stringify(record.payload), record.timestamp);
  }

  query(filter: { operationId?: string; transformationType?: string; since?: number } = {}): SemanticReplayRecord[] {
    let sql = 'SELECT * FROM semantic_replay_events WHERE 1=1';
    const params: (string | number)[] = [];
    if (filter.operationId) { sql += ' AND operation_id = ?'; params.push(filter.operationId); }
    if (filter.transformationType) { sql += ' AND transformation_type = ?'; params.push(filter.transformationType); }
    if (filter.since !== undefined) { sql += ' AND timestamp >= ?'; params.push(filter.since); }
    sql += ' ORDER BY timestamp ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      operationId: r.operation_id,
      transformationType: r.transformation_type,
      payload: JSON.parse(r.payload),
      timestamp: r.timestamp,
    }));
  }

  byOperation(operationId: string): SemanticReplayRecord[] {
    return this.query({ operationId });
  }

  byTransformation(transformationType: string): SemanticReplayRecord[] {
    return this.query({ transformationType });
  }

  clear(): void {
    this.db.prepare('DELETE FROM semantic_replay_events').run();
  }
}
