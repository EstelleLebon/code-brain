import type Database from 'better-sqlite3';
import type { CognitiveReplayEvent, ReplayEventType } from '../../replay/types.js';

/** Persistent append-only store for CognitiveReplayEvents (v1.6 replay log). */
export class ReplayLogStore {
  constructor(private readonly db: Database.Database) {}

  append(event: CognitiveReplayEvent): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO replay_events (id, operation_id, event_type, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.transactionId,
      event.eventType,
      JSON.stringify({ artifactIds: event.artifactIds, metadata: event.metadata }),
      event.timestamp,
    );
  }

  query(filter: { operationId?: string; eventType?: ReplayEventType; since?: number } = {}): CognitiveReplayEvent[] {
    let sql = 'SELECT * FROM replay_events WHERE 1=1';
    const params: (string | number)[] = [];
    if (filter.operationId) { sql += ' AND operation_id = ?'; params.push(filter.operationId); }
    if (filter.eventType) { sql += ' AND event_type = ?'; params.push(filter.eventType); }
    if (filter.since !== undefined) { sql += ' AND timestamp >= ?'; params.push(filter.since); }
    sql += ' ORDER BY timestamp ASC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => {
      const p = JSON.parse(r.payload);
      return {
        id: r.id,
        timestamp: r.timestamp,
        eventType: r.event_type as ReplayEventType,
        artifactIds: p.artifactIds ?? [],
        transactionId: r.operation_id,
        metadata: p.metadata,
      };
    });
  }

  byOperation(operationId: string): CognitiveReplayEvent[] {
    return this.query({ operationId });
  }

  clear(): void {
    this.db.prepare('DELETE FROM replay_events').run();
  }
}
